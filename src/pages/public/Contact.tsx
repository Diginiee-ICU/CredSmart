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
    url: "https://pos.credalert.bussiness/contact",
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
        canonicalUrl="https://pos.credalert.bussiness/contact"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Contact Us", url: "/contact" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/80 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" /> Support &amp; Statutory Inquiries
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            We&apos;re Here to Support Your Business
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Have questions about billing, multi-store setup, hardware compatibility, or statutory compliance? Reach our support team and grievance desk.
          </p>
        </div>
      </section>

      {/* Main Form & Info Grid */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Contact Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl glass-card-3d space-y-6 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white pl-1">Send Us a Direct Message</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 pl-1">
              Fill out the form below and our team will get back to you within 24 hours.
            </p>

            {submitted ? (
              <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Message Sent Successfully</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Your ticket has been logged. Our customer success team will contact you shortly.
                </p>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="mt-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs"
                >
                  Send Another Inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pl-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Your Full Name *</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-foreground rounded-xl text-xs h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rahul@business.com"
                      className="bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-foreground rounded-xl text-xs h-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone / WhatsApp Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-foreground rounded-xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message / Inquiry *</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your business requirement, hardware query, or issue..."
                    rows={4}
                    className="bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-foreground rounded-xl text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>Submit Message</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: Statutory Grievance & Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl glass-card-3d space-y-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-rose-600 rounded-l-2xl" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 font-mono">
                Statutory Desk
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Grievance Officer Details</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Appointed pursuant to Section 5(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the DPDP Act, 2023.
              </p>

              <div className="space-y-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500">Designation:</span>
                  <p className="text-slate-900 dark:text-slate-200 font-bold">Grievance Officer &amp; Legal Compliance</p>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span>
                  <p className="text-amber-600 dark:text-amber-400 font-mono font-bold">support@credalert.business</p>
                </div>
                <div>
                  <span className="text-slate-500">Grievance SLA:</span>
                  <p className="text-slate-900 dark:text-slate-200 font-semibold">Acknowledgement within 24h • Resolution within 15 days</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl glass-card-3d space-y-3 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-l-2xl" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" /> Operating Support Hours
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Monday to Saturday: 09:30 AM – 07:00 PM IST<br />
                Emergency server &amp; cloud sync monitoring: 24/7/365
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
