import { Link } from "react-router-dom";
import { Shield, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
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

      <section className="py-12 md:py-16 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8">
          <div className="border-b border-slate-100 pb-6 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              DPDP Act, 2023 &amp; IT Act Aligned
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A1931] tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Last Updated: August 2026</p>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">1. Information We Collect</h2>
              <p>
                When you use CredSmart, we collect information necessary to provide you with point-of-sale, GST billing, and inventory services. This includes:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li><strong>Account Information:</strong> Your name, email address, phone number, and authentication credentials.</li>
                <li><strong>Business Information:</strong> Store legal name, business trade name, address, GSTIN, PAN, and contact details.</li>
                <li><strong>Store Operational Data:</strong> Item catalogs, inventory levels, sales invoices, customer credit records, and supplier purchase records.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">2. How We Use Your Data</h2>
              <p>
                Your business and transactional data belongs exclusively to you. We use this data solely to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Process POS billing, invoice generation, tax reporting, and inventory reconciliation.</li>
                <li>Authenticate your account securely across desktop and mobile devices.</li>
                <li>Provide customer support and critical statutory service notifications.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">3. Data Protection &amp; Encryption</h2>
              <p>
                All data in transit is encrypted using TLS 1.3 with 256-bit AES encryption. Data stored at rest is isolated through multi-tenant database Row-Level Security (RLS). We never sell, rent, or monetize your store's customer database or supplier pricing.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">4. Contact Our Grievance Desk</h2>
              <p>
                For data protection inquiries or to exercise your rights under the DPDP Act, 2023, reach our Grievance Officer at <a href="mailto:grievance@credsmart.in" className="text-blue-600 font-semibold hover:underline">grievance@credsmart.in</a>.
              </p>
            </section>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner />
    </PublicLayout>
  );
}
