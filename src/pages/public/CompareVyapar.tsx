import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function CompareVyapar() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "CredSmart vs Vyapar & myBillBook",
    description:
      "Detailed feature and price comparison between CredSmart, Vyapar, and myBillBook for Indian retail and wholesale businesses.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };

  const comparisons = [
    {
      feature: "Cost / Annual Fee",
      credsmart: "100% Free Forever (₹0)",
      competitor: "₹2,999 – ₹6,999 / year per device",
      winner: "credsmart",
      notes: "CredSmart has zero software fees, zero renewal charges, and zero locked features.",
    },
    {
      feature: "Multi-Device Real-Time Cloud Sync",
      credsmart: "Built-in Real-Time Cloud",
      competitor: "Paid / Manual Google Drive sync",
      winner: "credsmart",
      notes: "Use CredSmart seamlessly across phone, tablet, and PC with instantaneous data sync.",
    },
    {
      feature: "Barcode Label Generator Studio",
      credsmart: "Included Free (Thermal & A4 Sheets)",
      competitor: "Paid Desktop Only / Extra Addon",
      winner: "credsmart",
      notes: "Design and print custom barcode price stickers directly from your web browser.",
    },
    {
      feature: "Multi-Store & Branch Switching",
      credsmart: "Unlimited Branches (1-Tap Switch)",
      competitor: "Requires New License per Store",
      winner: "credsmart",
      notes: "Add all your shops and godowns under one account with zero extra fees.",
    },
    {
      feature: "B2B MCA Vendor Discovery",
      credsmart: "3.2M+ MCA Companies Included",
      competitor: "Not Available",
      winner: "credsmart",
      notes: "Search through MCA/GSTIN-verified suppliers and import their details directly into your Khata.",
    },
    {
      feature: "Thermal ESC/POS & A4 Printing",
      credsmart: "8 Modern Invoice Themes Free",
      competitor: "Basic templates / Paid customization",
      winner: "credsmart",
      notes: "Full support for 2-inch (58mm), 3-inch (80mm) thermal rolls and professional A4 tax invoices.",
    },
    {
      feature: "GSTR-1 JSON Schema 2.0 Export",
      credsmart: "Instant 1-Click Export Free",
      competitor: "Available only in higher-tier paid plans",
      winner: "credsmart",
      notes: "Directly upload your monthly sales return JSON to the official GSTN portal.",
    },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="CredSmart vs Vyapar & myBillBook — 100% Free Alternative | CredSmart by CredAlert"
        description="Looking for the best free alternative to Vyapar or myBillBook? Compare CredSmart features, pricing, cloud sync, barcode printing, and multi-branch management."
        keywords="Vyapar alternative free, myBillBook alternative free, CredSmart vs Vyapar, CredSmart vs myBillBook, best billing software India, free GST invoice app comparison"
        canonicalUrl="https://pos.credalert.bussiness/compare-vyapar"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Compare Vyapar", url: "/compare-vyapar" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 text-center border-b border-slate-200/80 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-amber-600/20 text-amber-600" /> Honest Software Comparison
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            The Modern, Free Alternative to{" "}
            <span className="text-[#FF6A00]">
              Vyapar &amp; myBillBook
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Stop paying thousands annually for basic billing software. See why retailers and distributors are switching to CredSmart.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-3xl bg-white border border-slate-200/80 shadow-md">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="p-4 sm:p-5">Feature</th>
                  <th className="p-4 sm:p-5 text-amber-700 font-bold bg-amber-50/80 border-x border-amber-200">
                    CredSmart (100% Free)
                  </th>
                  <th className="p-4 sm:p-5">Vyapar / myBillBook (Paid)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisons.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="p-4 sm:p-5">
                      <div className="font-bold text-slate-900">{c.feature}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{c.notes}</div>
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-amber-700 bg-amber-50/30 border-x border-amber-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{c.credsmart}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{c.competitor}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Ready to Switch and Save ₹5,000+ Yearly?"
        highlightedText="100% Free."
        subtitle="Import your existing products and customers in minutes with zero disruption."
        ctaText="Make the Switch Free"
      />
    </PublicLayout>
  );
}
