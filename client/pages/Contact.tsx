import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, HelpCircle, Building2, Globe, ArrowRight, Users, Shield, Zap, Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/Footer';

type ContactTopic = "support" | "sales" | "partnerships";

interface ContactProps {
  embed?: boolean;
}

const initialSupportForm = {
  name: "",
  email: "",
  phone: "",
  message: "",
  urgency: "",
  workspace: "",
};

const initialSalesForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  teamSize: "",
  goals: "",
};

const initialPartnershipForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  partnershipType: "",
  website: "",
  message: "",
};

const buildStructuredMessage = (
  sectionTitle: string,
  lines: Array<string | null | undefined>,
  bodyLabel: string,
  body: string,
) => {
  return [
    `Topic: ${sectionTitle}`,
    ...lines.filter(Boolean),
    "",
    `${bodyLabel}:`,
    body.trim(),
  ].join("\n");
};

export default function Contact({ embed = false }: ContactProps) {
  const [activeTab, setActiveTab] = useState<ContactTopic>("support");
  const [supportForm, setSupportForm] = useState({ ...initialSupportForm });
  const [salesForm, setSalesForm] = useState({ ...initialSalesForm });
  const [partnershipForm, setPartnershipForm] = useState({ ...initialPartnershipForm });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!embed || typeof window === "undefined" || window.parent === window) {
      return;
    }

    const postEmbedHeight = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      window.parent.postMessage(
        {
          type: "scoremachine:contact-embed-resize",
          height,
        },
        "*",
      );
    };

    postEmbedHeight();

    const frameId = window.requestAnimationFrame(postEmbedHeight);
    const resizeObserver = new ResizeObserver(() => {
      postEmbedHeight();
    });

    resizeObserver.observe(document.body);
    window.addEventListener("resize", postEmbedHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", postEmbedHeight);
    };
  }, [embed, activeTab, error, success, loading]);

  const handleScrollToForm = () => {
    if (embed) {
      return;
    }

    const target = document.getElementById("contact-form");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const resetFeedback = () => {
    setError("");
    setSuccess(false);
  };

  const submitContactRequest = async (payload: {
    name: string;
    email: string;
    phone: string;
    message: string;
    topic: ContactTopic;
  }) => {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!supportForm.name.trim() || !supportForm.email.trim() || !supportForm.phone.trim() || !supportForm.message.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    setLoading(true);

    try {
      await submitContactRequest({
        name: supportForm.name,
        email: supportForm.email,
        phone: supportForm.phone,
        topic: "support",
        message: buildStructuredMessage(
          "Support",
          [
            supportForm.urgency.trim() ? `Urgency: ${supportForm.urgency.trim()}` : null,
            supportForm.workspace.trim() ? `Workspace: ${supportForm.workspace.trim()}` : null,
          ],
          "Request",
          supportForm.message,
        ),
      });

      setSuccess(true);
      setSupportForm({ ...initialSupportForm });
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!salesForm.name.trim() || !salesForm.email.trim() || !salesForm.phone.trim() || !salesForm.goals.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    setLoading(true);

    try {
      await submitContactRequest({
        name: salesForm.name,
        email: salesForm.email,
        phone: salesForm.phone,
        topic: "sales",
        message: buildStructuredMessage(
          "Sales",
          [
            salesForm.company.trim() ? `Company: ${salesForm.company.trim()}` : null,
            salesForm.teamSize.trim() ? `Team Size: ${salesForm.teamSize.trim()}` : null,
          ],
          "Goals",
          salesForm.goals,
        ),
      });

      setSuccess(true);
      setSalesForm({ ...initialSalesForm });
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePartnershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!partnershipForm.name.trim() || !partnershipForm.email.trim() || !partnershipForm.phone.trim() || !partnershipForm.message.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    setLoading(true);

    try {
      await submitContactRequest({
        name: partnershipForm.name,
        email: partnershipForm.email,
        phone: partnershipForm.phone,
        topic: "partnerships",
        message: buildStructuredMessage(
          "Partnerships",
          [
            partnershipForm.company.trim() ? `Company: ${partnershipForm.company.trim()}` : null,
            partnershipForm.partnershipType.trim() ? `Partnership Type: ${partnershipForm.partnershipType.trim()}` : null,
            partnershipForm.website.trim() ? `Website: ${partnershipForm.website.trim()}` : null,
          ],
          "Proposal",
          partnershipForm.message,
        ),
      });

      setSuccess(true);
      setPartnershipForm({ ...initialPartnershipForm });
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateSupportForm = (field: keyof typeof initialSupportForm, value: string) => {
    setSupportForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSalesForm = (field: keyof typeof initialSalesForm, value: string) => {
    setSalesForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePartnershipForm = (field: keyof typeof initialPartnershipForm, value: string) => {
    setPartnershipForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTabChange = (value: string) => {
    resetFeedback();
    setActiveTab(value as ContactTopic);
  };

  return (
    <div className={embed ? "relative overflow-hidden bg-transparent py-4" : "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20"}>
      <Helmet>
        <title>{embed ? "Contact Embed - Score Machine" : "Contact Us - Score Machine | Support & Inquiries"}</title>
        <meta name="description" content="Contact Score Machine for support, account assistance, or platform guidance. Our team provides help with onboarding, technical questions, and feature navigation. Typical responses within business hours." />
        <link rel="canonical" href="https://scoremachine.com/contact" />
        {embed && <meta name="robots" content="noindex,nofollow" />}
      </Helmet>
      {!embed && <SiteHeader />}
      
      {!embed && (
      <>
      {/* Enhanced Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Multi-layer Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue via-sea-green to-purple-600"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white max-w-4xl mx-auto">
            
            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl font-bold my-6 leading-tight">
              Questions about our
              <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent pb-2">
                Platform or services?
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed max-w-3xl mx-auto">
              Our team is here to assist.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-8 text-white/80">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm">Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm">Fast Response Times*</span>
              </div>
            </div>
            <div className="text-center mb-8 text-white/60 text-xs max-w-2xl mx-auto">
              <p>*Client count reflects cumulative users since inception. Response times may vary based on inquiry volume.</p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-ocean-blue hover:bg-white/90 font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleScrollToForm}
              >
                Contact Us
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      </>
      )}

      {/* Contact Section */}
      <section id="contact-form" className={embed ? "py-0 relative" : "py-20 relative"}>
        <div className={embed ? "mx-auto max-w-4xl px-4" : "container mx-auto px-4"}>
          <div className={embed ? "" : "grid lg:grid-cols-3 gap-12"}>
            {!embed && (
            <>
            {/* Left: Enhanced Quick Contact */}
            <div className="space-y-6">
              {/* Contact Methods */}
              <div className="bg-white rounded-2xl border border-gray-200/50 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocean-blue to-sea-green flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Quick Contact</h3>
                    <p className="text-sm text-gray-600">Get in touch instantly</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 flex-none rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 leading-tight">Email Support</p>
                      <p className="text-sm text-gray-600 leading-tight">support@thescoremachine.com</p>
                      <p className="text-xs text-green-600 font-medium leading-tight">Fast response times</p>
                    </div>
                  </div>
                  
                  <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 flex-none rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 leading-tight">Phone Support</p>
                      <p className="text-sm text-gray-600 leading-tight">(475) 259-8768</p>
                      <p className="text-xs text-green-600 font-medium leading-tight">Available 9am-6pm PST</p>
                    </div>
                  </div>
                  
                  <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 flex-none rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 leading-tight">Live Chat</p>
                      <p className="text-sm text-gray-600 leading-tight">Instant messaging</p>
                      <p className="text-xs text-green-600 font-medium leading-tight">Online now</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Global Support Badge - removed per request */}
              
              {/* Trust Indicators */}
              <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-lg">
                <h4 className="font-semibold mb-4 text-gray-900">Why Choose Us?</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">High Customer Satisfaction*</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Reliable Platform</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">*Based on internal post-support surveys.</p>
              </div>
            </div>
            </>
            )}

            {/* Right: Contact Tabs and Form */}
            <div className={embed ? "space-y-6" : "lg:col-span-2 space-y-6"}>
              <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-ocean-blue/10 to-sea-green/10">
                      <MessageSquare className="h-5 w-5 text-ocean-blue" />
                    </div>
                    <CardTitle className="text-2xl bg-gradient-to-r from-ocean-blue to-sea-green bg-clip-text text-transparent">
                      Send Us a Message
                    </CardTitle>
                  </div>
                  <CardDescription className="text-base text-gray-600">
                    Choose a topic and share a few details. We'll get back to you quickly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="mb-6 border-green-200 bg-green-50">
                      <AlertDescription className="text-green-700">Your message has been sent. We'll be in touch soon.</AlertDescription>
                    </Alert>
                  )}

                  <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-slate-100/80 p-1">
                      <TabsTrigger value="support" className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-ocean-blue data-[state=active]:shadow-sm">
                        Support
                      </TabsTrigger>
                      <TabsTrigger value="sales" className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-ocean-blue data-[state=active]:shadow-sm">
                        Sales
                      </TabsTrigger>
                      <TabsTrigger value="partnerships" className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-ocean-blue data-[state=active]:shadow-sm">
                        Partnerships
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="support" className="space-y-6">
                      <form onSubmit={handleSupportSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-gray-700">Name</Label>
                            <Input 
                              id="name" 
                              value={supportForm.name} 
                              onChange={(e) => updateSupportForm("name", e.target.value)} 
                              placeholder="Your name" 
                              className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                            <Input 
                              id="email" 
                              type="email" 
                              value={supportForm.email} 
                              onChange={(e) => updateSupportForm("email", e.target.value)} 
                              placeholder="you@example.com" 
                              className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-sm font-medium text-gray-700">Describe your request</Label>
                          <Textarea 
                            id="message" 
                            value={supportForm.message} 
                            onChange={(e) => updateSupportForm("message", e.target.value)} 
                            placeholder="Include goals, steps, screenshots, or URLs" 
                            rows={6} 
                            className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg resize-none"
                            required
                          />
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Urgency</Label>
                            <Input value={supportForm.urgency} onChange={(e) => updateSupportForm("urgency", e.target.value)} placeholder="Low / Medium / High" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Workspace</Label>
                            <Input value={supportForm.workspace} onChange={(e) => updateSupportForm("workspace", e.target.value)} placeholder="Company or team name" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Phone</Label>
                            <Input
                              type="tel"
                              value={supportForm.phone}
                              onChange={(e) => updateSupportForm("phone", e.target.value)}
                              placeholder="+1 (555) 000-0000"
                              className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11"
                              required
                            />
                          </div>
                        </div>
                        <Button 
                          type="submit" 
                          disabled={loading} 
                          className="bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-medium px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 h-12"
                        >
                          {loading ? "Sending..." : (
                            <span className="inline-flex items-center">
                              Send Message <Send className="ml-2 h-4 w-4" />
                            </span>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="sales" className="space-y-6">
                      <form onSubmit={handleSalesSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                            <Input value={salesForm.name} onChange={(e) => updateSalesForm("name", e.target.value)} placeholder="Your name" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" required />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Work Email</Label>
                            <Input type="email" value={salesForm.email} onChange={(e) => updateSalesForm("email", e.target.value)} placeholder="you@company.com" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" required />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Company</Label>
                            <Input value={salesForm.company} onChange={(e) => updateSalesForm("company", e.target.value)} placeholder="Company name" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Team Size</Label>
                            <Input value={salesForm.teamSize} onChange={(e) => updateSalesForm("teamSize", e.target.value)} placeholder="e.g., 10-50" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Phone</Label>
                            <Input type="tel" value={salesForm.phone} onChange={(e) => updateSalesForm("phone", e.target.value)} placeholder="+1 (555) 000-0000" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">What are you looking to achieve?</Label>
                          <Textarea value={salesForm.goals} onChange={(e) => updateSalesForm("goals", e.target.value)} placeholder="Share your goals, team size, and timeline" rows={5} className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg resize-none" required />
                        </div>
                        <div className="flex gap-4">
                          <Button asChild variant="outline" className="border-ocean-blue text-ocean-blue hover:bg-ocean-blue/5 rounded-lg px-6 py-3 h-12">
                            <a href="/pricing" target={embed ? "_top" : undefined} rel={embed ? "noopener noreferrer" : undefined}>View Pricing</a>
                          </Button>
                          <Button type="submit" className="bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-medium px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 h-12">
                            Request Demo
                          </Button>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="partnerships" className="space-y-6">
                      <form onSubmit={handlePartnershipSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Contact Name</Label>
                            <Input value={partnershipForm.name} onChange={(e) => updatePartnershipForm("name", e.target.value)} placeholder="Your name" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" required />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Business Email</Label>
                            <Input type="email" value={partnershipForm.email} onChange={(e) => updatePartnershipForm("email", e.target.value)} placeholder="you@company.com" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" required />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Company</Label>
                            <Input value={partnershipForm.company} onChange={(e) => updatePartnershipForm("company", e.target.value)} placeholder="Company name" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Partnership Type</Label>
                            <Input value={partnershipForm.partnershipType} onChange={(e) => updatePartnershipForm("partnershipType", e.target.value)} placeholder="Affiliate / Reseller / White Label" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Website</Label>
                            <Input value={partnershipForm.website} onChange={(e) => updatePartnershipForm("website", e.target.value)} placeholder="https://" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Phone</Label>
                            <Input type="tel" value={partnershipForm.phone} onChange={(e) => updatePartnershipForm("phone", e.target.value)} placeholder="+1 (555) 000-0000" className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg h-11" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Describe your partnership proposal</Label>
                          <Textarea value={partnershipForm.message} onChange={(e) => updatePartnershipForm("message", e.target.value)} placeholder="Share your audience, goals, and how you'd like to partner" rows={5} className="border-gray-200 focus:border-ocean-blue focus:ring-ocean-blue/20 rounded-lg resize-none" required />
                        </div>
                        <Button type="submit" className="bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-medium px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 h-12">
                          Submit Proposal
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {!embed && (
      <>
      {/* FAQs */}
      <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-blue/5 to-sea-green/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-ocean-blue/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-sea-green/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-ocean-blue/10 to-sea-green/10 rounded-full">
                  <HelpCircle className="h-4 w-4 text-ocean-blue" />
                  <span className="text-sm font-medium text-ocean-blue">FAQ</span>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-ocean-blue to-sea-green bg-clip-text text-transparent pb-3">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Answers to common questions about Score Machine and your account.
                </p>
              </div>
              
              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="item-1" className="border border-gray-200 rounded-xl px-6 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <AccordionTrigger className="text-left font-semibold text-gray-800 hover:text-ocean-blue py-6">
                    How fast do you respond?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-6 leading-relaxed">
                    We aim for fast response times during office hours. For urgent issues, our premium support offers prioritized assistance.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2" className="border border-gray-200 rounded-xl px-6 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <AccordionTrigger className="text-left font-semibold text-gray-800 hover:text-ocean-blue py-6">
                    Do you offer onboarding?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-6 leading-relaxed">
                    Yes, we provide guided onboarding and comprehensive resources to help you launch your credit strategy toolkit. Our team will walk you through setup and best practices.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3" className="border border-gray-200 rounded-xl px-6 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <AccordionTrigger className="text-left font-semibold text-gray-800 hover:text-ocean-blue py-6">
                    Is live chat available?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-6 leading-relaxed">
                    Live chat is available for all paid plans and trial users during office hours (9 AM - 6 PM PST). Outside these hours, you can leave a message and we'll respond promptly.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4" className="border border-gray-200 rounded-xl px-6 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <AccordionContent className="text-gray-600 pb-6 leading-relaxed">
                    We're SOC 2 compliant with enterprise-grade security including 256-bit encryption, regular security audits, and strict data privacy controls to protect your sensitive information.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5" className="border border-gray-200 rounded-xl px-6 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <AccordionTrigger className="text-left font-semibold text-gray-800 hover:text-ocean-blue py-6">
                    Can I cancel anytime?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-6 leading-relaxed">
                    Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees. Your data remains accessible during your billing period.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="lg:pl-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/20 to-sea-green/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-ocean-blue to-sea-green rounded-full flex items-center justify-center mx-auto">
                        <MessageSquare className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800">Still have questions?</h3>
                      <p className="text-gray-600">Our support team is here to help you succeed.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Customer Support Team</p>
                          <p className="text-sm text-gray-600">Dedicated specialists</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Fast Response</p>
                          <p className="text-sm text-gray-600">Prompt assistance</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <a href="tel:4752598768"> Call Now (475) 259-8768</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="bg-gray-900 text-gray-400 py-8 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center">
           <p className="text-xs">Score Machine is a software platform. We do not provide financial advice or guarantee credit score improvements.</p>
        </div>
      </div>
      <Footer />
      </>
      )}
    </div>
  );
}
