import React, { useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Shield, Lock, Eye, Server, Globe } from 'lucide-react';

const Privacy: React.FC = () => {
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
              <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full mb-6">
                <Lock className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                Privacy Policy
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Privacy Policy for SCORE MACHINE MASTER SOFTWARE & SERVICES
              </p>
            </div>

            <Card className="shadow-xl border-0 bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
              <CardContent className="p-8 md:p-12 prose prose-slate max-w-none">
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-0">
                    <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
                  </p>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  This Privacy Policy describes how ADR Wealth Advisors LLC, doing business as The Score Machine (the "Company," "we," "us," or "our"), collects, uses, processes, and protects the information we obtain in connection with your use of our proprietary software platform and services (collectively, the "Platform" or "Services").
                </p>

                <p className="text-slate-600 leading-relaxed">
                  This Privacy Policy is an integral part of and is subject to the SCORE MACHINE MASTER SOFTWARE & SERVICES AGREEMENT (the "Agreement"). All capitalized terms not defined herein have the meanings set forth in the Agreement.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">1.</span> ⚙️ Data Collection and Sources
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  We collect and process various types of information necessary to provide the Services, primarily based on the explicit authorization granted by the User in the Agreement.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">1.1 Information Provided Directly by the User</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  This includes information provided during account creation, subscription, and ongoing use:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li><strong>Identity and Contact Data:</strong> Full name, business name, physical address, email address, phone number, and account credentials.</li>
                  <li><strong>Financial and Billing Data:</strong> Payment method details, subscription history, invoices, and transaction records required for billing purposes (processed by authorized third-party payment processors).</li>
                  <li><strong>User Input and Account Configuration:</strong> Data submitted directly by the User into the Platform for analysis, personal preferences, and settings.</li>
                  <li><strong>Compliance Data:</strong> Electronic signatures, consents, certifications, and compliance documentation (e.g., authorization forms) required under the Agreement or applicable law.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">1.2 Credit and Financial Data from Third Parties (User-Authorized Data)</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  The core function of the Platform relies on accessing, retrieving, and processing data from external sources as authorized by you:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li><strong>Third-Party Data Providers:</strong> Data retrieved from consumer-reporting agencies, credit-data aggregators, identity-verification services, and financial information providers (including, but not limited to, those referred to as [MyFreeScore], [IQ], [SmartCredit], or their successors).</li>
                  <li><strong>Types of Data Retrieved:</strong> Consumer and commercial credit reports, scores, financial histories, tradelines, public record data, identifying information, discrepancies, and related variables necessary for forensic analysis, scoring, and recommendation generation.</li>
                  <li><strong>Authorization:</strong> The User grants the Company a continuously valid, non-exclusive, worldwide right and authority to obtain, transmit, parse, analyze, and process this data for the duration of the Agreement, and as required to fulfill the Services.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">1.3 Usage and Technical Data</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  This data is automatically collected when accessing or interacting with the Platform:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li><strong>Platform Usage Data:</strong> Access logs, login timestamps, IP addresses, browser type, operating system, pages viewed, features utilized, and interaction patterns.</li>
                  <li><strong>System Performance Data:</strong> Data related to the operation, security, and integrity of the Platform, including error reports, API usage limits, and diagnostic information.</li>
                </ul>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">2.</span> 🎯 Use of Information (Purpose of Processing)
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  We use the collected information for the following specific and necessary purposes, as outlined in the Agreement:
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">2.1 Provision of Services and Contractual Performance</h3>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li>To enable access to the Platform and provide the licensed Services.</li>
                  <li>To retrieve, normalize, and interpret credit data to generate Derivative Outputs (reports, scores, analyses, and recommendations).</li>
                  <li>To deliver educational, coaching, community, and AI-driven funding recommendation modules.</li>
                  <li>To process payments, manage the User Account, and provide customer support, troubleshooting, and maintenance.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">2.2 Product Development and Improvement</h3>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li>To conduct internal research, refinement, and development of the Platform, Services, algorithms, and AI models.</li>
                  <li>To create derivative works, enhancements, updates, and improvements to the Company IP, which may incorporate non-identifiable usage data and Feedback (as defined in the Agreement).</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">2.3 Legal, Security, and Compliance</h3>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li>To verify the identity and authority of the User and maintain Account security (Section 1.4).</li>
                  <li>To detect, prevent, and investigate fraudulent, unauthorized, or illegal activity, including improper chargebacks (Article VI).</li>
                  <li>To enforce the terms of the Agreement, including intellectual property rights, indemnification, and non-disparagement obligations (Article V, VII).</li>
                  <li>To comply with applicable laws, legal processes (subpoenas, court orders), and regulatory requirements, including those under the Fair Credit Reporting Act (FCRA) and other data protection statutes (Section 3.4).</li>
                </ul>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">3.</span> 🌐 Disclosure of Information
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  We will not sell or rent User-Authorized Credit Data. We only disclose information as necessary to fulfill our contractual obligations, as authorized by the User, or as required by law.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">3.1 Service Providers and Partners</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We share information with trusted third parties who provide services on our behalf and are bound by confidentiality obligations. These include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li><strong>Third-Party Data Providers:</strong> Sharing identity and authentication data to retrieve credit information as authorized by the User.</li>
                  <li><strong>Payment Processors:</strong> Sharing billing information to process subscription fees and other charges.</li>
                  <li><strong>Hosting and IT Vendors:</strong> Sharing necessary data with providers that host and maintain the Platform infrastructure.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">3.2 Legal and Regulatory Requirements</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We may disclose information, including User-Authorized Data, if we believe in good faith that it is necessary to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                  <li>Comply with a subpoena, court order, regulatory demand, or other compulsory legal process.</li>
                  <li>Enforce our rights, terms, and conditions, including investigating potential breaches of the Agreement (e.g., fraudulent Chargebacks).</li>
                  <li>Protect the rights, property, or safety of the Company, our users, or the public.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">3.3 Business Transactions</h3>
                <p className="text-slate-600 leading-relaxed">
                  In the event of a merger, acquisition, sale of assets, or similar business transaction, we may transfer User information to the successor or acquiring entity, subject to the assignee assuming the obligations of this Privacy Policy and the Agreement (Section 10.5).
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">4.</span> 🛡️ Data Security and Confidentiality
                </h2>
                
                <h3 className="text-xl font-semibold text-slate-800 mt-6">4.1 Security Measures</h3>
                <p className="text-slate-600 leading-relaxed">
                  We employ commercially reasonable and industry-standard administrative, technical, and physical safeguards designed to protect the Platform and User Data from unauthorized access, disclosure, or alteration (Section 1.4(e)).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">4.2 User Responsibility</h3>
                <p className="text-slate-600 leading-relaxed">
                  You acknowledge that the security of your Account relies heavily on the maintenance of your own Account credentials and security controls (Section 1.4(b)). You bear sole responsibility for all acts and omissions occurring under your Account (Section 1.4(c)).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">4.3 Confidential Information</h3>
                <p className="text-slate-600 leading-relaxed">
                  All non-public proprietary data, including algorithms, models, system architecture, and Derivative Outputs, constitutes the Company's Confidential Information (Article V). We maintain strict internal protocols to preserve the secrecy and security of this information.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">5.</span> Retention and Deletion
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">5.1 Data Retention</h3>
                <p className="text-slate-600 leading-relaxed">
                  We retain User information for the duration of the User's active Agreement and subscription term, and for a reasonable period thereafter as required for legitimate business purposes (e.g., auditing, legal compliance, dispute resolution, and enforcement of the Agreement).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">5.2 Post-Termination Data Handling</h3>
                <p className="text-slate-600 leading-relaxed">
                  Following the termination or expiration of the Agreement, the Company may retain User data and Derivative Outputs for a transitional period (e.g., thirty (30) calendar days – Section 4.4(b)). Thereafter, the Company may permanently delete, destroy, or irreversibly anonymize all data associated with the User’s Account, unless retention is required by law or necessary to enforce the Company's rights under the Agreement.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">6.</span> 🌍 Jurisdiction and Governing Law
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">6.1 Governing Law</h3>
                <p className="text-slate-600 leading-relaxed">
                  This Privacy Policy, and any disputes related to data processing or privacy practices hereunder, shall be governed by and construed exclusively in accordance with the laws of the State of Wyoming (Article IX).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6">6.2 Dispute Resolution</h3>
                <p className="text-slate-600 leading-relaxed">
                  Any controversy or claim arising under this Privacy Policy shall be subject to the mandatory and exclusive binding arbitration provisions set forth in Article VIII (Dispute Resolution) of the Agreement, including the waiver of jury trial and class actions.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">7.</span> 📝 Changes to this Policy
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  The Company reserves the right to revise, amend, or update this Privacy Policy at any time, in its sole discretion (Section 10.2). If any amendment materially alters the User's rights or obligations, we will provide reasonable advance electronic or in-platform notice. Your continued use of the Platform after the effective date of the revised policy constitutes your binding acceptance of the changes.
                </p>

                <hr className="my-8 border-slate-200" />

                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">8.</span> 📞 Contact Information
                </h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  If you have questions about this Privacy Policy or our data handling practices, please contact us at:
                </p>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <p className="text-slate-800 font-semibold">ADR Wealth Advisors LLC d/b/a The Score Machine</p>
                  <p className="text-slate-600">Attn: Legal Department</p>
                  <p className="text-slate-600">5830 E 2ND ST, STE 7000 #24151</p>
                  <p className="text-slate-600 mb-2">Casper, Wyoming 82609</p>
                  <p className="text-slate-600">
                    <strong>Email:</strong> <a href="mailto:adrwealthadvisorsllc@gmail.com" className="text-emerald-600 hover:text-emerald-700 hover:underline">adrwealthadvisorsllc@gmail.com</a>
                  </p>
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

export default Privacy;
