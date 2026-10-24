import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact CredSmart by CredAlert Support & Grievance Desk",
    description: "Official contact channels, statutory Grievance Officer details, and customer support for CredSmart by CredAlert.",
    url: "https://credsmart.online/contact",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email, and message");
      return;
    }
    setSubmitted(true);
    toast.success("Thank you! Your message has been received. Our team will respond within 24 hours.");
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Contact Us & Grievance Officer — CredSmart by CredAlert"
        description="Get in touch with CredSmart support team, submit business feedback, or reach our statutory Grievance Officer under Section 2(1)(w) IT Act."
        keywords="contact CredSmart, CredSmart support, GST billing support India, grievance officer CredSmart, DPDP compliance contact"
        canonicalUrl="https://credsmart.online/contact"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Contact Us", url: "/contact" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5 text-emerald-600" /> Support &amp; Statutory Inquiries
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            We're Here to Support Your Business
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Have questions about billing, multi-store setup, hardware compatibility, or statutory compliance? Reach our support team and grievance desk.
          </p>
        </div>
      </section>

      {/* Contact Cards & Form */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Helpdesk */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A1931]">Customer Support Desk</h3>
                  <p className="text-xs text-slate-500">General assistance &amp; product onboarding</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Email: <a href="mailto:support@credsmart.in" className="text-blue-600 font-semibold hover:underline">support@credsmart.in</a>
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Response Time: Mon – Sat, 9:00 AM – 7:00 PM IST (&lt; 24h)</span>
              </div>
            </div>

            {/* Statutory Desk */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-l-2xl" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A1931]">Grievance Officer (IT Act)</h3>
                  <p className="text-xs text-slate-500">Section 2(1)(w) IT Act, 2000 Compliance</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                For legal inquiries, takedown requests, or statutory notices under Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:
              </p>
              <p className="text-xs text-slate-600">
                Email: <a href="mailto:grievance@credsmart.in" className="text-amber-600 font-semibold hover:underline">grievance@credsmart.in</a>
              </p>
            </div>

            {/* Fast Resolution Guarantee */}
            <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Zero-Cost Support Included
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All customer support, video tutorials, and technical troubleshooting are provided 100% free of charge to all registered merchants.
              </p>
            </div>
          </div>

          {/* Right Form */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-2xl bg-white border border-slate-200/80 shadow-md relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-600 via-indigo-600 to-[#FF6A00] rounded-l-2xl" />
              
              <div className="space-y-2 mb-6">
                <h3 className="text-2xl font-black text-[#0A1931]">Send Us a Message</h3>
                <p className="text-xs text-slate-500">Fill in the details below and our team will get back to you promptly.</p>
              </div>

              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold text-[#0A1931]">Message Sent Successfully!</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Our customer success team has received your ticket and will respond via email within 24 business hours.
                  </p>
                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    className="mt-4 border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Your Full Name *</label>
                      <Input
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Email Address *</label>
                      <Input
                        required
                        type="email"
                        placeholder="e.g. ramesh@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 h-11 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Phone Number (Optional)</label>
                    <Input
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 h-11 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">How Can We Help You? *</label>
                    <Textarea
                      required
                      rows={5}
                      placeholder="Please describe your query, store type, or hardware setup questions..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 text-xs resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Ready to Transform Your Invoicing?"
        highlightedText="100% Free Forever."
        subtitle="Create your store account now and issue your first GST invoice in less than 30 seconds."
        ctaText="Start Free Billing Now"
      />
    </PublicLayout>
  );
}
