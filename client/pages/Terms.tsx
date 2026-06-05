import React, { useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Shield, FileText, Lock, AlertCircle } from 'lucide-react';

const Terms: React.FC = () => {
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
              <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-700 rounded-full mb-6">
                <FileText className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                Terms and Conditions of Service
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Please read these terms carefully before using our platform.
              </p>
            </div>

            <Card className="shadow-xl border-0 bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <CardContent className="p-8 md:p-12 prose prose-slate max-w-none">
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-0">
                    <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
                  </p>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-0">
                  <span className="text-blue-600">1.</span> 🤝 Acceptance of Terms and Service Overview
                </h2>
                
                <h3 className="text-xl font-semibold text-slate-800 mt-6">Core Agreement</h3>
                <p className="text-slate-600 leading-relaxed">
                  Welcome to The Score Machine! This Terms and Conditions of Service document (the "Agreement") is a legally binding contract between you, the User (individual or entity), and ADR Wealth Advisors LLC, doing business as The Score Machine (the "Company"). By clicking "I Accept," checking an acknowledgment box, signing, or otherwise accessing or using the Score Machine software platform or Services, you agree to be legally bound by all terms and conditions of this Agreement.
                </p>

                <p className="text-slate-600 leading-relaxed">
                  Your access and use of the Score Machine software platform (the "Platform") and all associated features, modules, reports, and consultation services (the "Services") are strictly governed by this Agreement. You represent that you have read, understand, and agree to all its provisions. If you are accepting on behalf of an entity, you warrant that you have full authority to bind that entity.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Nature of the Platform</h3>
                <p className="text-slate-600 leading-relaxed">
                  The Platform is a proprietary, confidential software-as-a-service (SaaS) solution. It uses integrated systems, algorithms, and artificial intelligence (AI) to retrieve, analyze, interpret, and present consumer and commercial credit-related data, along with providing advisory, coaching, and funding-recommendation functionalities (the "Services").
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Dynamic Nature of Services</h3>
                <p className="text-slate-600 leading-relaxed">
                  You acknowledge that the Platform and Services are dynamic, continuously evolving technologies. We reserve the right, in our sole discretion, to expand, modify, enhance, suspend, or discontinue any feature, module, or functionality at any time. Continued use after any modification constitutes your full acceptance of the changes.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">2.</span> 📝 License and Permitted Use
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Limited License Grant</h3>
                <p className="text-slate-600 leading-relaxed">
                  Subject to your full compliance with this Agreement and timely payment of fees, the Company grants you a personal, limited, revocable, non-exclusive, and non-transferable license (the "License") to access and use the Platform and Services solely for your own bona fide internal business operations or personal informational use.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li>No eligibility decisions</li>
                  <li>No onboarding decisions</li>
                  <li>Educational use only</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Ownership and Intellectual Property ("Company IP")</h3>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li><strong>Exclusive Ownership:</strong> The Company retains all right, title, and interest in and to the Platform, the Services, all underlying software, algorithms, trade secrets, documentation, and all related intellectual property rights (Company IP).</li>
                  <li><strong>Derivative Outputs:</strong> All reports, analyses, scores, recommendations, and other results generated by the Platform ("Derivative Outputs") are the exclusive intellectual property of the Company. You receive only a limited, non-transferable right to view and use these Derivative Outputs for your internal purposes.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Prohibited Conduct (What You Cannot Do)
                </h3>
                <p className="text-slate-600 mb-4">You agree not to, and will not permit any third party to:</p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li><strong>Reverse Engineer:</strong> Attempt to derive the source code, object code, algorithms, or underlying logic of the Platform.</li>
                  <li><strong>Compete:</strong> Use the Platform or Derivative Outputs to develop, train, benchmark, or support any competing product, service, or algorithm.</li>
                  <li><strong>Exploit:</strong> Copy, reproduce, distribute, sell, publish, rent, lease, or otherwise commercialize any portion of the Platform or Derivative Outputs for the benefit of any third party.</li>
                  <li><strong>Interfere:</strong> Circumvent security measures, engage in data-scraping, bulk harvesting, or introduce any malicious code (virus, malware, etc.) that could damage or disrupt the Platform.</li>
                </ul>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">3.</span> 💳 Fees, Payment, and Cancellation
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Subscription Fees and Billing</h3>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li><strong>Recurring Charges:</strong> You agree to pay the recurring subscription fees ("Subscription Fees") applicable to your plan. Fees are due and payable in advance of each billing cycle and are earned upon processing.</li>
                  <li><strong>Automatic Renewal:</strong> Your subscription will automatically renew for successive renewal periods unless properly canceled. By accepting this Agreement, you authorize the Company to store your payment method and automatically charge it for all recurring and incremental fees without further notice.</li>
                  <li><strong>Taxes:</strong> All charges are exclusive of any applicable taxes, which you are solely responsible for paying.</li>
                  <li><strong>Payment Failures:</strong> Failure to maintain a current, valid payment method or non-payment of any amount due is a material breach of this Agreement, which may result in suspension or termination of your access.</li>
                </ul>

                <div className="mt-8 p-6 bg-red-50 rounded-xl border border-red-100">
                  <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    🚫 No Refunds Policy
                  </h3>
                  <p className="text-red-700 leading-relaxed">
                    All fees are non-refundable, non-cancelable, and fully earned upon payment. You acknowledge that the Platform is a hosted, on-demand digital service providing immediate electronic delivery upon activation, and therefore no refund, rebate, offset, or credit will be issued for partial periods of use, unused functionality, or upon termination or cancellation.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Cancellation Procedure</h3>
                <p className="text-slate-600 leading-relaxed">
                  To prevent automatic renewal, you must submit a formal cancellation request through the Platform's secure account-management interface or by written notice to the Company no fewer than three (3) days prior to the end of the current billing cycle. Cancellation is only effective upon expiration of the current billing cycle.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">4.</span> 🔒 User Duties, Data Authorization, and Security
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Accuracy of Information</h3>
                <p className="text-slate-600 leading-relaxed">
                  You represent and warrant that all information, data, and documentation you provide to the Company—including personal identifying information and financial records—is and shall remain true, accurate, current, complete, and not misleading. You must promptly update any information that becomes inaccurate.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">5.</span> 💔 Chargebacks and Disputes
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Restriction on Payment Reversals</h3>
                <p className="text-slate-600 leading-relaxed">
                  Except for a demonstrably unauthorized transaction (verified identity theft or fraud), you agree not to initiate or participate in any credit-card chargeback, payment reversal, or transaction dispute with any financial institution or payment processor relating to any payment made under this Agreement.
                </p>

                <div className="mt-8 p-6 bg-red-50 rounded-xl border border-red-100">
                  <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Consequences of Improper Chargebacks
                  </h3>
                  <p className="text-red-700 leading-relaxed mb-4">
                    Any attempt to obtain a chargeback in violation of this section is a material breach of contract and may be treated as intentional fraud. Upon such an attempt, the Company may:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-red-700">
                    <li>Immediately suspend or terminate your access to the Platform.</li>
                    <li>Recover all disputed amounts, bank/processor fees, administrative costs, and attorneys’ fees.</li>
                    <li>Report the conduct to relevant financial and credit-reporting agencies.</li>
                  </ul>
                </div>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">6.</span> 🤫 Confidentiality and Reputation
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Confidential Information</h3>
                <p className="text-slate-600 leading-relaxed">
                  You agree to hold all non-public, proprietary, and sensitive information disclosed by the Company (including algorithms, software, business plans, Derivative Outputs, and the terms of this Agreement) as Confidential Information in the strictest confidence. You shall use such information only as necessary to exercise your rights under this Agreement and shall not disclose it to any third party.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Covenant of Non-Disparagement</h3>
                <p className="text-slate-600 leading-relaxed">
                  You agree that, both during the Term and indefinitely thereafter, you will not, directly or indirectly, make, publish, post, or communicate any false, misleading, defamatory, disparaging, or injurious statement concerning the Company, its affiliates, employees, or the Platform and Services. This covenant survives the termination of your access.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Remedies for Breach</h3>
                <p className="text-slate-600 leading-relaxed">
                  You acknowledge that any breach of confidentiality or the non-disparagement covenant will cause irreparable harm to the Company, entitling the Company to seek immediate injunctive relief (a court order to stop the action) in addition to all other remedies, including monetary damages.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">7.</span> ⚖️ Indemnification and Limitation of Liability
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">User Indemnification</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  You agree to defend, indemnify, and hold harmless the Company and its affiliates and employees from and against any and all claims, liabilities, losses, damages, costs, and expenses (including reasonable attorneys’ fees) arising out of or resulting from:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li>Your breach of this Agreement.</li>
                  <li>Your use or misuse of the Platform or Services.</li>
                  <li>Any inaccuracy in the data you provide.</li>
                  <li>Your violation of any applicable law or the rights of any third party.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Limitation of Liability</h3>
                <p className="text-slate-600 leading-relaxed">
                  The Company's total cumulative liability for any and all claims arising out of or related to this Agreement shall in no event exceed the total amount of fees you paid to the Company during the twelve (12)-month period preceding the claim.
                </p>
                <p className="text-slate-600 leading-relaxed mt-4">
                  <strong>Exclusion of Damages:</strong> To the maximum extent permitted by law, the Company shall not be liable for any indirect, consequential, incidental, exemplary, special, or punitive damages, or for any loss of profits, revenue, business opportunity, goodwill, use, or data.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">8.</span> 🗺️ Governing Law and Dispute Resolution
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Governing Law</h3>
                <p className="text-slate-600 leading-relaxed">
                  This Agreement and any dispute arising out of or related to it shall be governed by, construed, and enforced exclusively in accordance with the laws of the State of Wyoming, without regard to its conflict-of-laws principles.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Mandatory and Exclusive Arbitration</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Any and all claims, controversies, or disputes arising out of or relating to this Agreement or the Services shall be resolved exclusively by binding arbitration conducted in Casper, Wyoming, before a single neutral arbitrator.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  The arbitration shall be administered under the then-current rules of the American Arbitration Association (AAA) or JAMS, as elected by the Company.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Waiver of Jury Trial and Class Actions</h3>
                <p className="text-slate-600 leading-relaxed">
                  By accepting this Agreement, you knowingly and voluntarily waive any right to a trial by jury. Furthermore, you agree that any arbitration or dispute resolution proceeding shall be conducted solely on an individual basis and not as a class, collective, consolidated, or representative action.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-600">9.</span> 🗂️ Miscellaneous Provisions
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Entire Agreement</h3>
                <p className="text-slate-600 leading-relaxed">
                  This document, together with any order forms or policies expressly incorporated herein, constitutes the entire agreement between you and the Company and supersedes all prior or contemporaneous agreements or communications.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Amendments</h3>
                <p className="text-slate-600 leading-relaxed">
                  The Company reserves the unilateral right to revise, amend, or update this Agreement at any time. Your continued use of the Platform after the effective date of any modification constitutes your binding acceptance of the revised terms.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">Notices</h3>
                <p className="text-slate-600 leading-relaxed">
                  All official legal notices must be in writing and delivered as specified in Article XI of the Master Software & Services Agreement, with electronic delivery to the email address on file being a valid method of service.
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

export default Terms;
