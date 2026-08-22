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
import { ROUTE_PATHS } from "@/config/routes";

export default function About() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About CredSmart POS & ERP",
    description:
      "CredSmart POS is India's free GST billing, POS, and financial infrastructure provider designed for Indian MSMEs.",
    url: "https://credsmart.in/about",
    mainEntity: {
      "@type": "Organization",
      name: "CredSmart POS",
      url: "https://credsmart.in",
      logo: "https://credsmart.in/favicon.png",
      foundingDate: "2024",
      description: "Indian commercial technology intermediary providing free GST billing and POS infrastructure.",
    },
  };

  return (
    <PublicLayout>
      <SEOHead
        title="About Us — Empowering Indian MSMEs with Free Tech | CredSmart"
        description="Learn about CredSmart's mission to digitize 63M+ Indian micro and small businesses with free enterprise-grade GST billing, POS, and inventory software."
        keywords="about CredSmart, free billing software company India, MSME billing tech India, Section 2(1)(w) IT Act intermediary, DPDP compliant billing software"
        canonicalUrl="https://credsmart.in/about"
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/80 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" /> Our Mission &amp; Purpose
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Democratizing Enterprise Billing for Every Indian MSME
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We believe no Indian retail shop, wholesaler, or small business should be forced to pay exorbitant annual software licenses just to issue a legal GST invoice.
          </p>
        </div>
      </section>

      {/* Story & Pillars */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              ₹0
            </div>
            <h3 className="text-base font-bold text-white">Free Forever Software</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We remove the financial barrier of retail software. Core billing, inventory, and Khata features will remain 100% free with zero trial limits or locked modules.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Statutory Governance</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Operated under Section 2(1)(w) of the Information Technology Act, 2000 as a neutral technology intermediary with built-in statutory dispute workflows.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">DPDP 2023 Aligned</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fully compliant with the Digital Personal Data Protection Act, 2023. Your business records and customer identities are private, encrypted, and never monetized.
            </p>
          </div>
        </div>

        {/* Commitment to Indian MSMEs */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-4">
          <h2 className="text-2xl font-bold text-white">
            Built in India, for Indian Commercial Realities
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            From local Kirana shops managing Udhar credit books to wholesale distributors shipping across state borders with e-Way bills and GSTR-1 filings, Indian commerce requires specialized software. CredSmart was engineered from the ground up to support Indian GST slabs, thermal roll printing, barcode label formatting, and multi-store management.
          </p>
          <div className="pt-4 flex items-center gap-4">
            <Link to={ROUTE_PATHS.auth}>
              <Button className="h-11 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-md">
                Join the Free Billing Revolution <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
