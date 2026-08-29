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
      feature: "B2B Verified Vendor Directory",
      credsmart: "3.2M+ Verified Indian Companies",
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
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 text-center border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-amber-400/20" /> Honest Software Comparison
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            The Modern, Free Alternative to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400">
              Vyapar &amp; myBillBook
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop paying ₹3,000 to ₹7,000 every year for basic billing software. Discover why thousands of businesses are migrating to CredSmart POS.
          </p>

          <div className="pt-4 flex justify-center">
            <Link to={ROUTE_PATHS.auth}>
              <button className="h-12 px-8 rounded-xl glowing-btn-amber text-white font-bold text-sm shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center">
                Switch to CredSmart 100% Free <ArrowRight className="w-4 h-4 ml-2 stroke-[2.5]" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Grid */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Feature-by-Feature Breakdown
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            How CredSmart POS out-delivers legacy offline software on every metric.
          </p>
        </div>

        <div className="space-y-4">
          {comparisons.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl glass-card-3d hover:border-amber-400/40 transition-colors space-y-4 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-rose-600 rounded-l-2xl" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pl-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">{item.feature}</h3>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 w-fit">
                  CredSmart Wins
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pl-1">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span>CredSmart POS</span>
                  </div>
                  <p className="text-xs font-black">{item.credsmart}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-slate-400">
                    <XCircle className="w-4 h-4 text-slate-400" />
                    <span>Vyapar / myBillBook</span>
                  </div>
                  <p className="text-xs font-semibold">{item.competitor}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic border-t border-slate-200/80 dark:border-slate-800/60 pt-3 pl-1">
                💡 {item.notes}
              </p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
