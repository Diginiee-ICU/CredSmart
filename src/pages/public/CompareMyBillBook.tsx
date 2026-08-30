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

export default function CompareMyBillBook() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "CredSmart vs myBillBook",
    description:
      "Detailed feature and price comparison between CredSmart and myBillBook for Indian retail, wholesale, and distributor businesses.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };

  const comparisons = [
    {
      feature: "Annual Software Cost",
      credsmart: "100% Free Forever (₹0)",
      competitor: "₹2,599 – ₹6,999 / year per business",
      winner: "credsmart",
      notes: "CredSmart has zero license fees, zero renewals, and all modules unlocked from day one.",
    },
    {
      feature: "Device & User Limits",
      credsmart: "Unlimited Mobile + Desktop Logins",
      competitor: "1 to 3 devices per plan (Extra fees for more)",
      winner: "credsmart",
      notes: "Run billing simultaneously on billing PC, warehouse tablet, and owner's mobile phone.",
    },
    {
      feature: "Barcode Label Designer Studio",
      credsmart: "Included Free (Thermal & A4 Sheets)",
      competitor: "Requires Custom Paid Addon",
      winner: "credsmart",
      notes: "Design custom barcode labels, price stickers, and SKU tags directly inside the web app.",
    },
    {
      feature: "Multi-Store & Branch Switching",
      credsmart: "Unlimited Branches (1-Tap Switch)",
      competitor: "Requires Separate Business License",
      winner: "credsmart",
      notes: "Manage multiple retail branches and godowns under one account with zero extra fees.",
    },
    {
      feature: "B2B MCA & GSTIN Vendor Discovery",
      credsmart: "3.2M+ Verified Indian Companies",
      competitor: "Not Available",
      winner: "credsmart",
      notes: "Search authorized distributors and import vendor GSTIN profiles with 1 click.",
    },
    {
      feature: "Customer Udhar Khata & WhatsApp",
      credsmart: "Unlimited Free WhatsApp Statements",
      competitor: "Limited SMS / Paid credits",
      winner: "credsmart",
      notes: "Send instant digital Khata balance statements and UPI collection links to customer WhatsApp.",
    },
    {
      feature: "Official GSTR-1 JSON Schema 2.0",
      credsmart: "Instant 1-Click Export Free",
      competitor: "Locked in Premium Tiers",
      winner: "credsmart",
      notes: "Directly upload your monthly sales return JSON to the official GSTN portal.",
    },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="CredSmart vs myBillBook — 100% Free Alternative | CredSmart by CredAlert"
        description="Looking for the best free alternative to myBillBook? Compare CredSmart features, ₹0 pricing, multi-device cloud sync, barcode label printing, and multi-store management."
        keywords="myBillBook alternative free, CredSmart vs myBillBook, free billing app like mybillbook, best GST invoice app India, zero cost billing app"
        canonicalUrl="https://pos.credalert.bussiness/compare-mybillbook"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Compare myBillBook", url: "/compare-mybillbook" },
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
              myBillBook
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate annual subscription fees. Compare feature-for-feature why merchants are switching from myBillBook to CredSmart.
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
                  <th className="p-4 sm:p-5">Capability / Module</th>
                  <th className="p-4 sm:p-5 text-amber-700 font-bold bg-amber-50/80 border-x border-amber-200">
                    CredSmart (100% Free)
                  </th>
                  <th className="p-4 sm:p-5">myBillBook (Paid Subscription)</th>
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
        title="Ready to Switch and Save on Billing?"
        highlightedText="100% Free."
        subtitle="Import your existing products and customers in minutes with zero downtime."
        ctaText="Switch to CredSmart Free"
      />
    </PublicLayout>
  );
}
