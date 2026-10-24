import { Link } from "react-router-dom";
import {
  FileCheck,
  Receipt,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Building2,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function EInvoicingGuide() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "The Complete Guide to e-Invoicing & IRN Generation in India (2026)",
      description:
        "Comprehensive regulatory guide on GST e-Invoicing applicability, IRN generation, B2B tax compliance, signed QR codes, and IRP portal integration in India.",
      author: {
        "@type": "Organization",
        name: "CredSmart Research Team",
      },
      publisher: {
        "@type": "Organization",
        name: "CredSmart by CredAlert",
        logo: {
          "@type": "ImageObject",
          url: "https://pos.credalert.bussiness/favicon.png",
        },
      },
      datePublished: "2026-01-01",
      dateModified: "2026-08-30",
      mainEntityOfPage: "https://pos.credalert.bussiness/e-invoicing-guide",
    },
  ];

  const thresholds = [
    { phase: "Phase 1", effectiveDate: "1st Oct 2020", turnover: "Above ₹500 Cr", applicability: "Large Corporations" },
    { phase: "Phase 2", effectiveDate: "1st Jan 2021", turnover: "Above ₹100 Cr", applicability: "Upper Mid-Market" },
    { phase: "Phase 3", effectiveDate: "1st Apr 2021", turnover: "Above ₹50 Cr", applicability: "Medium Enterprises" },
    { phase: "Phase 4", effectiveDate: "1st Apr 2022", turnover: "Above ₹20 Cr", applicability: "Small Enterprises" },
    { phase: "Phase 5", effectiveDate: "1st Oct 2022", turnover: "Above ₹10 Cr", applicability: "Micro & Small Businesses" },
    { phase: "Phase 6", effectiveDate: "1st Aug 2023+", turnover: "Above ₹5 Cr", applicability: "MSMEs & Wholesalers" },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="e-Invoicing Guide 2026 — IRN, Thresholds & GSTN Rules | CredSmart"
        description="Learn all about GST e-Invoicing in India: ₹5 Cr turnover threshold rules, Invoice Reference Number (IRN), Signed QR code generation, and 1-click B2B tax compliance."
        keywords="e invoicing guide India, GST e-invoice rules, IRN generation software, e invoice turnover threshold 2026, free e invoicing software India"
        canonicalUrl="https://pos.credalert.bussiness/e-invoicing-guide"
        ogType="article"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "e-Invoicing Guide", url: "/e-invoicing-guide" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold uppercase tracking-wider">
            <FileCheck className="w-3.5 h-3.5 text-blue-600" /> Regulatory Knowledge Pillar
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            The Complete Guide to GST e-Invoicing in India
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Understand legal applicability, Invoice Reference Number (IRN) generation, Signed QR codes, and how CredSmart makes B2B e-Invoicing compliance effortless.
          </p>
        </div>
      </section>

      {/* Thresholds Table */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#0A1931]">1. Current e-Invoicing Turnover Thresholds</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Under Rule 48(4) of the CGST Rules, businesses whose aggregate annual turnover exceeded ₹5 Crore in any preceding financial year from 2017-18 onwards are mandatory required to issue e-Invoices for all B2B and export supplies.
          </p>
          <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="p-4">Implementation Phase</th>
                  <th className="p-4">Effective Date</th>
                  <th className="p-4">Annual Turnover Threshold</th>
                  <th className="p-4">Target Businesses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {thresholds.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-900">{t.phase}</td>
                    <td className="p-4 text-slate-600">{t.effectiveDate}</td>
                    <td className="p-4 font-bold text-amber-700 font-mono">{t.turnover}</td>
                    <td className="p-4 text-slate-600">{t.applicability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-[#0A1931]">Invoice Creation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create your standard B2B invoice with customer GSTIN, HSN codes, and item quantities in CredSmart.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-black text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-[#0A1931]">IRP Portal Validation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The invoice data is verified by the Invoice Registration Portal (IRP) which computes the unique 64-character IRN hash.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-[#0A1931]">Signed QR Code Printed</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The digitally signed QR code containing the IRN is attached to the invoice for instant verification and e-Way bill readiness.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Simplify Your GST Invoicing & Compliance."
        highlightedText="100% Free."
        subtitle="Generate GST-compliant B2B invoices and 1-click GSTR-1 return files with zero software fees."
        ctaText="Start Free Invoicing"
      />
    </PublicLayout>
  );
}
