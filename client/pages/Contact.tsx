import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const COMPANY_PHONE_DISPLAY = "(704) 966-9919";
const COMPANY_PHONE_LINK = "tel:+17049669919";
const SUPPORT_EMAIL = "support@thecapsol.com";
const BUSINESS_EMAIL = "Bizcredit@FREAD.Life";
const COMPANY_ADDRESS = ["525 North Tryon St.", "Ste 1600, Charlotte, North Carolina 28202 USA"];

const buildStructuredMessage = (
  sectionTitle: string,
  lines: Array<string | null | undefined>,
  bodyLabel: string,
  body: string,
) =>
  [
    `Topic: ${sectionTitle}`,
    ...lines.filter(Boolean),
    "",
    `${bodyLabel}:`,
    body.trim(),
  ].join("\n");

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
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      window.parent.postMessage({ type: "scoremachine:contact-embed-resize", height }, "*");
    };

    postEmbedHeight();
    const frameId = window.requestAnimationFrame(postEmbedHeight);
    const resizeObserver = new ResizeObserver(() => postEmbedHeight());
    resizeObserver.observe(document.body);
    window.addEventListener("resize", postEmbedHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", postEmbedHeight);
    };
  }, [embed, activeTab, loading, error, success]);

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
    } catch {
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
    } catch {
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
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const rootClassName = embed ? "relative overflow-hidden bg-white py-4" : "min-h-screen overflow-hidden bg-white text-slate-950";

  return (
    <div className={rootClassName}>
      <Helmet>
        <title>{embed ? "Contact Embed - CapSol" : "Contact | CapSol"}</title>
        <meta
          name="description"
          content="Contact CapSol for support, business development, partnerships, or platform questions."
        />
      </Helmet>

      {!embed && <SiteHeader />}

      <main>
        {!embed && (
          <section className="relative isolate overflow-hidden bg-slate-950 py-24 text-white lg:py-32">
            <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_76%_18%,rgba(20,184,166,0.24),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(16,185,129,0.18),transparent_24%)]" />
            <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:56px_56px]" />
            <div className="container mx-auto grid gap-14 px-4 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200">
                  <Sparkles className="h-4 w-4" />
                  Let’s talk about your next capital move
                </div>
                <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                  Reach the team behind
                  <span className="block bg-gradient-to-r from-teal-300 via-emerald-300 to-lime-200 bg-clip-text text-transparent">
                    CapSol.
                  </span>
                </h1>
                <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                  Whether you need platform support, partnership help, or a conversation about funding readiness, we’re here to help you move forward.
                </p>
                <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                  {["Support and onboarding", "Business development inquiries", "Charlotte-based company presence"].map((item) => (
                    <span key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400" /> {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-sm">
                  <Mail className="h-7 w-7 text-teal-300" />
                  <h2 className="mt-5 text-xl font-black">Email support</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{SUPPORT_EMAIL}</p>
                </article>
                <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-sm">
                  <Phone className="h-7 w-7 text-teal-300" />
                  <h2 className="mt-5 text-xl font-black">Phone</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{COMPANY_PHONE_DISPLAY}</p>
                </article>
                <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-sm">
                  <Building2 className="h-7 w-7 text-teal-300" />
                  <h2 className="mt-5 text-xl font-black">Business development</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{BUSINESS_EMAIL}</p>
                </article>
                <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-sm">
                  <MapPin className="h-7 w-7 text-teal-300" />
                  <h2 className="mt-5 text-xl font-black">Office</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{COMPANY_ADDRESS.join(" ")}</p>
                </article>
              </div>
            </div>
          </section>
        )}

        <section className={embed ? "py-4" : "bg-slate-50 py-24 lg:py-28"}>
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[.85fr_1.15fr]">
            <div className="space-y-6">
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Direct contact</CardTitle>
                  <CardDescription>The fastest ways to reach CapSol.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 h-5 w-5 text-teal-700" />
                    <div>
                      <p className="font-semibold text-slate-900">Support</p>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-600 hover:text-teal-700">
                        {SUPPORT_EMAIL}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-1 h-5 w-5 text-teal-700" />
                    <div>
                      <p className="font-semibold text-slate-900">Phone</p>
                      <a href={COMPANY_PHONE_LINK} className="text-slate-600 hover:text-teal-700">
                        {COMPANY_PHONE_DISPLAY}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-1 h-5 w-5 text-teal-700" />
                    <div>
                      <p className="font-semibold text-slate-900">Business Development</p>
                      <a href={`mailto:${BUSINESS_EMAIL}`} className="text-slate-600 hover:text-teal-700">
                        {BUSINESS_EMAIL}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-5 w-5 text-teal-700" />
                    <div>
                      <p className="font-semibold text-slate-900">Company Address</p>
                      {COMPANY_ADDRESS.map((line) => (
                        <p key={line} className="text-slate-600">{line}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Response expectations</CardTitle>
                  <CardDescription>What happens after you contact us.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-1 h-5 w-5 text-teal-700" />
                    <p className="text-slate-600">Support and contact requests are typically reviewed during business hours.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-1 h-5 w-5 text-teal-700" />
                    <p className="text-slate-600">Use the form for platform questions, funding-readiness conversations, or partnership outreach.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-5 w-5 text-teal-700" />
                    <p className="text-slate-600">Detailed requests help our team respond with more relevant next steps.</p>
                  </div>
                </CardContent>
              </Card>

              {!embed && (
                <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-400">Need more context first?</p>
                  <h3 className="mt-4 text-3xl font-black">Explore the platform before you reach out.</h3>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button className="bg-teal-500 font-bold text-slate-950 hover:bg-teal-400" asChild>
                      <Link to="/features">
                        View Features
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" className="border-white/20 bg-white/5 font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                      <Link to="/pricing">See Pricing</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Send us a message</CardTitle>
                <CardDescription>Choose the topic that best matches what you need.</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
                    <AlertDescription>Your message has been sent. We’ll be in touch soon.</AlertDescription>
                  </Alert>
                )}

                <Tabs value={activeTab} onValueChange={(value) => { resetFeedback(); setActiveTab(value as ContactTopic); }} className="space-y-6">
                  <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-slate-100 p-1">
                    <TabsTrigger value="support" className="rounded-xl">Support</TabsTrigger>
                    <TabsTrigger value="sales" className="rounded-xl">Sales</TabsTrigger>
                    <TabsTrigger value="partnerships" className="rounded-xl">Partnerships</TabsTrigger>
                  </TabsList>

                  <TabsContent value="support">
                    <form onSubmit={handleSupportSubmit} className="space-y-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <Label htmlFor="support-name">Name</Label>
                          <Input id="support-name" value={supportForm.name} onChange={(e) => setSupportForm((prev) => ({ ...prev, name: e.target.value }))} required />
                        </div>
                        <div>
                          <Label htmlFor="support-email">Email</Label>
                          <Input id="support-email" type="email" value={supportForm.email} onChange={(e) => setSupportForm((prev) => ({ ...prev, email: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <Label htmlFor="support-phone">Phone</Label>
                          <Input id="support-phone" value={supportForm.phone} onChange={(e) => setSupportForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                        </div>
                        <div>
                          <Label htmlFor="support-urgency">Urgency</Label>
                          <Input id="support-urgency" value={supportForm.urgency} onChange={(e) => setSupportForm((prev) => ({ ...prev, urgency: e.target.value }))} placeholder="Low / Medium / High" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="support-workspace">Workspace or Company</Label>
                        <Input id="support-workspace" value={supportForm.workspace} onChange={(e) => setSupportForm((prev) => ({ ...prev, workspace: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="support-message">How can we help?</Label>
                        <Textarea id="support-message" rows={6} value={supportForm.message} onChange={(e) => setSupportForm((prev) => ({ ...prev, message: e.target.value }))} required />
                      </div>
                      <Button type="submit" disabled={loading} className="h-12 bg-slate-950 font-bold hover:bg-teal-700">
                        {loading ? "Sending..." : "Send Support Request"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="sales">
                    <form onSubmit={handleSalesSubmit} className="space-y-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <Label htmlFor="sales-name">Full Name</Label>
                          <Input id="sales-name" value={salesForm.name} onChange={(e) => setSalesForm((prev) => ({ ...prev, name: e.target.value }))} required />
                        </div>
                        <div>
                          <Label htmlFor="sales-email">Work Email</Label>
                          <Input id="sales-email" type="email" value={salesForm.email} onChange={(e) => setSalesForm((prev) => ({ ...prev, email: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="grid gap-5 md:grid-cols-3">
                        <div>
                          <Label htmlFor="sales-company">Company</Label>
                          <Input id="sales-company" value={salesForm.company} onChange={(e) => setSalesForm((prev) => ({ ...prev, company: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="sales-team">Team Size</Label>
                          <Input id="sales-team" value={salesForm.teamSize} onChange={(e) => setSalesForm((prev) => ({ ...prev, teamSize: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="sales-phone">Phone</Label>
                          <Input id="sales-phone" value={salesForm.phone} onChange={(e) => setSalesForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="sales-goals">What are you trying to accomplish?</Label>
                        <Textarea id="sales-goals" rows={6} value={salesForm.goals} onChange={(e) => setSalesForm((prev) => ({ ...prev, goals: e.target.value }))} required />
                      </div>
                      <Button type="submit" disabled={loading} className="h-12 bg-slate-950 font-bold hover:bg-teal-700">
                        {loading ? "Sending..." : "Send Sales Inquiry"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="partnerships">
                    <form onSubmit={handlePartnershipSubmit} className="space-y-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <Label htmlFor="partner-name">Contact Name</Label>
                          <Input id="partner-name" value={partnershipForm.name} onChange={(e) => setPartnershipForm((prev) => ({ ...prev, name: e.target.value }))} required />
                        </div>
                        <div>
                          <Label htmlFor="partner-email">Business Email</Label>
                          <Input id="partner-email" type="email" value={partnershipForm.email} onChange={(e) => setPartnershipForm((prev) => ({ ...prev, email: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <Label htmlFor="partner-company">Company</Label>
                          <Input id="partner-company" value={partnershipForm.company} onChange={(e) => setPartnershipForm((prev) => ({ ...prev, company: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="partner-type">Partnership Type</Label>
                          <Input id="partner-type" value={partnershipForm.partnershipType} onChange={(e) => setPartnershipForm((prev) => ({ ...prev, partnershipType: e.target.value }))} placeholder="Affiliate / Reseller / Strategic" />
                        </div>
                      </div>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <Label htmlFor="partner-website">Website</Label>
                          <Input id="partner-website" value={partnershipForm.website} onChange={(e) => setPartnershipForm((prev) => ({ ...prev, website: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="partner-phone">Phone</Label>
                          <Input id="partner-phone" value={partnershipForm.phone} onChange={(e) => setPartnershipForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="partner-message">Proposal</Label>
                        <Textarea id="partner-message" rows={6} value={partnershipForm.message} onChange={(e) => setPartnershipForm((prev) => ({ ...prev, message: e.target.value }))} required />
                      </div>
                      <Button type="submit" disabled={loading} className="h-12 bg-slate-950 font-bold hover:bg-teal-700">
                        {loading ? "Sending..." : "Send Partnership Inquiry"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {!embed && <Footer />}
    </div>
  );
}
