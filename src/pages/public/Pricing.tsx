import { Link } from "react-router-dom";
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function Pricing() {
  const comparisonRows = [
    { feature: "Annual Subscription Cost", credsmart: "₹ 0 / Forever", vyapar: "₹ 2,999 - ₹ 4,999/yr", mybillbook: "₹ 2,599 - ₹ 6,999/yr", tally: "₹ 22,500 + GST" },
    { feature: "Invoices & Billing Volume", credsmart: "Unlimited", vyapar: "Limited in Basic", mybillbook: "Limited in Basic", tally: "Unlimited" },
    { feature: "Inventory SKUs & Items", credsmart: "Unlimited", vyapar: "Unlimited", mybillbook: "Limited in Basic", tally: "Unlimited" },
    { feature: "Barcode Label Designer Studio", credsmart: "Included Free", vyapar: "Paid Desktop Only", mybillbook: "Paid Addon", tally: "Requires 3rd Party Plugin" },
    { feature: "Multi-Branch & Store Management", credsmart: "Included Free", vyapar: "Extra ₹ / license", mybillbook: "Extra ₹ / business", tally: "Extra ₹ / multi-user" },
    { feature: "GSTR-1 JSON Schema 2.0 Export", credsmart: "Included Free", vyapar: "Paid Platinum", mybillbook: "Paid Custom Plan", tally: "CA Addon" },
    { feature: "Customer Udhar Khata & WhatsApp Alerts", credsmart: "Included Free", vyapar: "SMS / Paid credits", mybillbook: "SMS / Paid credits", tally: "Manual" },
    { feature: "Thermal ESC/POS & A4 Invoice Themes", credsmart: "8 Free Themes", vyapar: "Limited Free Themes", mybillbook: "Limited Themes", tally: "Basic Print" },
    { feature: "Cloud Multi-Device Synchronization", credsmart: "Instant Real-time", vyapar: "Paid Drive Sync", mybillbook: "Cloud Included", tally: "Paid TSS Remote" },
    { feature: "3.2M+ B2B Vendor Discovery", credsmart: "Included Free", vyapar: "Not Available", mybillbook: "Not Available", tally: "Not Available" },
    { feature: "Staff Accounts with Granular RBAC", credsmart: "Unlimited Cashiers", vyapar: "Extra per user", mybillbook: "Extra per user", tally: "Extra per user" },
  ];

  const pricingFaqs = [
    {
      q: "Why is CredSmart 100% free?",
      a: "Our core mission is to digitize every Indian retail shop, wholesaler, and MSME without barrier. We monetize through value-added B2B enterprise discovery and optional commercial infrastructure by CredAlert, ensuring retail billing software remains free forever.",
    },
    {
      q: "Are there any hidden costs, watermark on invoices, or trial expiration?",
      a: "None whatsoever. There are zero watermarks on your invoices, zero transaction fees on your standard sales, zero trial periods, and no credit card required.",
    },
    {
      q: "Can I add multiple retail stores or branches for free?",
      a: "Yes. You can create and manage multiple stores or branches under your account at zero cost and switch between them seamlessly on desktop and mobile.",
    },
    {
      q: "Is there any limit on how many items, customers, or bills I can create?",
      a: "No. You can add unlimited products, unlimited customer accounts, and generate unlimited sales and purchase invoices without restriction.",
    },
  ];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "CredSmart Business Management & POS Software",
      description: "100% Free GST Billing & POS Software for Indian Retailers, Wholesalers and MSMEs.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: pricingFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="Pricing — 100% Free Forever GST Billing & POS Software | CredSmart by CredAlert"
        description="CredSmart is 100% free forever. No software fees, no hidden charges, no invoice limits. Compare our ₹0 transparent pricing against Vyapar, myBillBook, and Tally."
        keywords="free GST billing software, free POS software price, Vyapar pricing comparison, myBillBook pricing comparison, free retail billing software India, zero cost billing app"
        canonicalUrl="https://pos.credalert.bussiness/pricing"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Pricing", url: "/pricing" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 text-center border-b border-slate-200/80 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-emerald-600/20 text-emerald-600" /> Honest &amp; Transparent Commitment
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight">
            ₹0. Free Today.{" "}
            <span className="text-[#FF6A00]">
              Free Tomorrow. Free Forever.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            No trial countdowns. No invoice limits. No locked features behind paywalls. Get enterprise-grade GST billing and POS software at zero cost.
          </p>

          {/* Master ₹0 Plan Card */}
          <div className="max-w-lg mx-auto mt-8 p-8 sm:p-10 rounded-2xl bg-white border-2 border-amber-500/40 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 font-mono">
                  Enterprise Community Edition
                </span>
                <h3 className="text-2xl font-black text-[#0A1931]">Full Business Suite</h3>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-[#0A1931] font-mono">₹ 0</div>
                <span className="text-[11px] text-emerald-600 font-bold">Lifetime Free</span>
              </div>
            </div>

            <ul className="py-6 space-y-3.5 text-left text-xs sm:text-sm text-slate-700">
              {[
                "Unlimited GST & Retail Invoices",
                "High-Speed POS Billing Terminal (F1-F12 Hotkeys)",
                "Full Inventory & Multi-Godown Warehouse Control",
                "Barcode & QR Code Label Designer Studio",
                "Customer Udhar Khata Ledger with WhatsApp Statements",
                "1-Click Official GSTR-1 & GSTR-3B Tax Schema Exports",
                "Thermal (58mm/80mm) & A4 Invoice Customizer",
                "Multi-Branch & Store Management (1-Tap Switch)",
                "Staff Accounts with Owner, Manager & Cashier RBAC",
                "Cloud Real-Time Cross-Device Sync (Mobile + Desktop)",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link to={ROUTE_PATHS.auth} className="block w-full">
              <button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8533] hover:from-[#E65F00] hover:to-[#FF6A00] text-white font-black text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
                Get Started 100% Free <ArrowRight className="w-4 h-4 ml-2 stroke-[2.5]" />
              </button>
            </Link>
            <p className="text-[11px] text-slate-500 mt-3 text-center">No credit card required • Instant 30-second setup</p>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-[#0A1931] tracking-tight">
            How CredSmart Compares with Legacy Paid Apps
          </h2>
          <p className="text-sm text-slate-600">
            See how much your business saves annually by switching to CredSmart.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200/80 shadow-md scrollbar-thin">
          <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
              <tr>
                <th className="p-4 sm:p-5">Feature / Capability</th>
                <th className="p-4 sm:p-5 text-amber-700 font-bold bg-amber-50/80 border-x border-amber-200">
                  CredSmart
                </th>
                <th className="p-4 sm:p-5">Vyapar</th>
                <th className="p-4 sm:p-5">myBillBook</th>
                <th className="p-4 sm:p-5">Tally ERP / Prime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 sm:p-5 font-semibold text-slate-900">{row.feature}</td>
                  <td className="p-4 sm:p-5 font-bold text-amber-700 bg-amber-50/30 border-x border-amber-200">
                    {row.credsmart}
                  </td>
                  <td className="p-4 sm:p-5 text-slate-600">{row.vyapar}</td>
                  <td className="p-4 sm:p-5 text-slate-600">{row.mybillbook}</td>
                  <td className="p-4 sm:p-5 text-slate-600">{row.tally}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing FAQs */}
      <section className="py-16 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A1931] text-center mb-10">
            Frequently Asked Questions About Pricing
          </h2>
          <div className="space-y-4">
            {pricingFaqs.map((faq, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="text-base font-bold text-[#0A1931] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Zero Fees. Zero Risk."
        highlightedText="Start Free Today."
        subtitle="No credit card, no contracts, and no hidden subscriptions. Create your store account now."
        ctaText="Claim Your Free Account"
      />
    </PublicLayout>
  );
}
