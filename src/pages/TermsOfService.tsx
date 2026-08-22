import { Link } from "react-router-dom";
import { FileText, ShieldCheck, Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { ROUTE_PATHS } from "@/config/routes";

export default function TermsOfService() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service — CredSmart POS",
    description: "CredSmart POS terms of service, user agreement, and Section 2(1)(w) IT Act intermediary safe-harbour terms.",
    url: "https://credsmart.in/terms-of-service",
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Terms of Service — User Agreement & Governance | CredSmart POS"
        description="Review the CredSmart POS Terms of Service, free service guarantee, merchant responsibilities, and intermediary governance under Section 2(1)(w) IT Act."
        keywords="CredSmart terms of service, GST billing software terms, Section 2(1)(w) IT Act intermediary, MSME billing terms India"
        canonicalUrl="https://credsmart.in/terms-of-service"
        structuredData={structuredData}
      />

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="border-b border-slate-800 pb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
            <FileText className="w-3.5 h-3.5" />
            User Agreement &amp; Intermediary Governance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-400">Last Updated: August 2026</p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using CredSmart POS (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">2. Free Service Guarantee</h2>
            <p>
              CredSmart POS provides GST billing, inventory management, customer ledger, barcode label design, and analytics features free of charge to retail and wholesale businesses across India. There are no mandatory subscription fees or trial limits for core software features.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">3. User Responsibilities &amp; Data Accuracy</h2>
            <p>
              You are responsible for safeguarding your login credentials, accurately configuring GST tax rates, maintaining true inventory and billing records, and complying with applicable Indian taxation laws and GST guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">4. Technology Intermediary Posture</h2>
            <p>
              CredSmart POS operates as a neutral digital technology intermediary under Section 2(1)(w) of the Information Technology Act, 2000. CredSmart does not initiate, select, or modify the contents of commercial invoices or ledger transactions created by merchants.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">5. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}
