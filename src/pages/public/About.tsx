import { Link } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  Scale,
  Users2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function About() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About CredSmart by CredAlert",
    description:
      "CredSmart by CredAlert is India's free GST billing, POS, and business management software provider designed for Indian MSMEs.",
    url: "https://pos.credalert.bussiness/about",
    mainEntity: {
      "@type": "Organization",
      name: "CredSmart by CredAlert",
      url: "https://pos.credalert.bussiness",
      logo: "https://pos.credalert.bussiness/favicon.png",
      description: "Indian commercial technology intermediary providing free GST billing and POS infrastructure by CredAlert.",
    },
  };

  return (
    <PublicLayout>
      <SEOHead
        title="About Us — Empowering Indian MSMEs with Free Tech | CredSmart by CredAlert"
        description="Learn about CredSmart's mission to digitize 63M+ Indian micro and small businesses with free enterprise-grade GST billing, POS, and inventory software."
        keywords="about CredSmart, free billing software company India, MSME billing tech India, Section 2(1)(w) IT Act intermediary, DPDP compliant billing software"
        canonicalUrl="https://pos.credalert.bussiness/about"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About Us", url: "/about" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-amber-600" /> Our Mission &amp; Purpose
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            Democratizing Enterprise Billing for Every Indian MSME
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We believe no Indian retail shop, wholesaler, or small business should be forced to pay exorbitant annual software licenses just to issue a legal GST invoice.
          </p>
        </div>
      </section>

      {/* Story & Pillars */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-2xl" />
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-black text-base shadow-xs">
              ₹0
            </div>
            <h3 className="text-lg font-black text-[#0A1931]">Free Forever Software</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We remove the financial barrier of retail software. Core billing, inventory, and Khata features will remain 100% free with zero trial limits or locked modules.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-2xl" />
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black text-base shadow-xs">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#0A1931]">Section 2(1)(w) Governance</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Operates as an impartial digital intermediary under the Information Technology Act, 2000. We do not participate in underlying trade debts or interfere with merchant autonomy.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-l-2xl" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black text-base shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#0A1931]">DPDP 2023 Aligned</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Fully compliant with the Digital Personal Data Protection Act, 2023. Your business records and customer identities are private, encrypted, and never monetized.
            </p>
          </div>
        </div>

        {/* Commitment to Indian MSMEs */}
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-md space-y-5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80">
            <Award className="w-3.5 h-3.5" /> Engineered for India
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A1931]">
            Built in India, for Indian Commercial Realities
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            From local Kirana shops managing Udhar credit books to wholesale distributors shipping across state borders with e-Way bills and GSTR-1 filings, Indian commerce requires specialized software. CredSmart was engineered from the ground up to support Indian GST slabs, thermal roll printing, barcode label formatting, and multi-store management.
          </p>
          <div className="pt-2 flex items-center gap-4">
            <Link to={ROUTE_PATHS.auth}>
              <button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8533] hover:from-[#E65F00] hover:to-[#FF6A00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
                Join the Free Billing Revolution <ArrowRight className="w-4 h-4 ml-2 stroke-[2.5]" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Start Digitizing Your Business Today."
        highlightedText="100% Free Forever."
        subtitle="Experience why thousands of Indian retail shops and distributors choose CredSmart."
        ctaText="Get Started 100% Free"
      />
    </PublicLayout>
  );
}
