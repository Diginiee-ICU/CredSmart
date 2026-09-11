import { Link } from "react-router-dom";
import { FileText, ShieldCheck, Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function TermsOfService() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service — CredSmart by CredAlert",
    description: "CredSmart terms of service, user agreement, and Section 2(1)(w) IT Act intermediary safe-harbour terms.",
    url: "https://pos.credalert.bussiness/terms-of-service",
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Terms of Service — User Agreement & Governance | CredSmart by CredAlert"
        description="Review the CredSmart Terms of Service, free service guarantee, merchant responsibilities, and intermediary governance under Section 2(1)(w) IT Act."
        keywords="CredSmart terms of service, GST billing software terms, Section 2(1)(w) IT Act intermediary, MSME billing terms India"
        canonicalUrl="https://pos.credalert.bussiness/terms-of-service"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Terms of Service", url: "/terms-of-service" },
        ]}
        structuredData={structuredData}
      />

      <section className="py-12 md:py-16 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8">
          <div className="border-b border-slate-100 pb-6 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              User Agreement &amp; Intermediary Governance
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A1931] tracking-tight">Terms of Service</h1>
            <p className="text-xs text-slate-500">Last Updated: August 2026</p>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">1. Acceptance of Terms</h2>
              <p>
                By creating an account, accessing, or using CredSmart by CredAlert, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">2. 100% Free Service Model</h2>
              <p>
                CredSmart is committed to offering enterprise-grade GST billing, inventory management, and POS terminal functionality completely free forever for Indian MSMEs. There are no mandatory software license fees, trial expirations, or locked invoicing tiers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">3. Digital Intermediary Safe-Harbour</h2>
              <p>
                CredSmart operates strictly as an electronic intermediary under Section 2(1)(w) of the Information Technology Act, 2000. CredSmart provides computing software and digital recordkeeping tools but is not a party to commercial contracts, credit debts, or goods transactions conducted between users.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0A1931]">4. User Responsibilities &amp; Tax Compliance</h2>
              <p>
                Users are solely responsible for ensuring the accuracy of GSTIN numbers, tax rates, invoice numbers, and HSN codes entered into invoices. CredSmart is a recordkeeping and computation tool and does not provide formal legal, tax, or Chartered Accountancy advice.
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
