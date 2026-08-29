import { Link } from "react-router-dom";
import { Shield, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { ROUTE_PATHS } from "@/config/routes";

export default function PrivacyPolicy() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy — CredSmart by CredAlert",
    description: "CredSmart privacy policy, data protection rules, and DPDP Act 2023 compliance.",
    url: "https://pos.credalert.bussiness/privacy-policy",
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Privacy Policy — Data Protection & DPDP 2023 | CredSmart by CredAlert"
        description="Read CredSmart's Privacy Policy. Learn how we safeguard your GST billing, customer ledgers, and inventory records under Indian data protection laws."
        keywords="CredSmart privacy policy, DPDP Act compliance, data security billing app, GST invoice data privacy"
        canonicalUrl="https://pos.credalert.bussiness/privacy-policy"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/privacy-policy" },
        ]}
        structuredData={structuredData}
      />

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="border-b border-slate-800 pb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5" />
            DPDP Act, 2023 &amp; IT Act Aligned
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400">Last Updated: August 2026</p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">1. Information We Collect</h2>
            <p>
              When you use CredSmart POS, we collect information necessary to provide you with point-of-sale, GST billing, and inventory services. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong>Account Information:</strong> Your name, email address, phone number, and authentication credentials.</li>
              <li><strong>Business Information:</strong> Store legal name, business trade name, address, GSTIN, PAN, and contact details.</li>
              <li><strong>Store Operational Data:</strong> Item catalogs, inventory levels, sales invoices, customer credit records, and supplier purchase records.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">2. How We Use Your Data</h2>
            <p>
              Your business and transactional data belongs exclusively to you. We use this data solely to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Process POS billing, invoice generation, tax reporting, and inventory reconciliation.</li>
              <li>Authenticate your account securely across desktop and mobile devices.</li>
              <li>Provide customer support and critical statutory service notifications.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">3. Data Security &amp; Storage</h2>
            <p>
              We employ enterprise-grade security protocols, encryption in transit (HTTPS/TLS 1.3), and secure cloud storage. Your database is isolated with strict Row-Level Security (RLS) policies ensuring no unauthorized access or data leakage between merchants.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">4. Third-Party Sharing</h2>
            <p>
              We do not sell, rent, or monetize your store data or customer details to any third-party advertisers or data brokers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">5. Contact &amp; Grievance Redressal</h2>
            <p>
              If you have any questions regarding your data privacy or rights under the Digital Personal Data Protection Act, 2023, please contact our Grievance Officer at <a href="mailto:support@credalert.business" className="text-amber-400 font-mono underline">support@credalert.business</a>.
            </p>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}
