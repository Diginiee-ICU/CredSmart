import { Link } from "react-router-dom";
import {
  FileText,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Scale,
  Sparkles,
  BookOpen,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function GstBillingGuide() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "The Complete Guide to GST Billing & Invoicing in India (2026)",
      description:
        "A comprehensive guide for Indian retail and wholesale businesses on GST rules, CGST/SGST/IGST calculation, HSN/SAC codes, e-Invoicing, and GSTR-1 tax compliance.",
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
      mainEntityOfPage: "https://pos.credalert.bussiness/gst-billing-guide",
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Generate a GST Compliant Invoice in India",
      step: [
        {
          "@type": "HowToStep",
          name: "Add Business & Customer Details",
          text: "Enter your registered GSTIN, trade name, and customer billing address.",
        },
        {
          "@type": "HowToStep",
          name: "Select Items and HSN Codes",
          text: "Add product line items with their corresponding 4 or 6 digit HSN codes.",
        },
        {
          "@type": "HowToStep",
          name: "Calculate CGST, SGST or IGST",
          text: "Apply intra-state (CGST + SGST) or inter-state (IGST) tax rates based on Place of Supply.",
        },
        {
          "@type": "HowToStep",
          name: "Print or Export Invoice",
          text: "Generate thermal receipt or A4 PDF with dynamic UPI payment QR code.",
        },
      ],
    },
  ];

  const gstSlabs = [
    { rate: "0%", category: "Exempted / Nil-Rated Goods", examples: "Unprocessed grains, fresh milk, vegetables, fresh meat, educational services." },
    { rate: "5%", category: "Essential Household Goods", examples: "Packaged foods, tea, coffee, edible oils, spices, footwear under ₹1,000, medicines." },
    { rate: "12%", category: "Standard Low-Tier Goods", examples: "Processed food, butter, cheese, ghee, notebooks, umbrellas, apparel above ₹1,000." },
    { rate: "18%", category: "General Commercial Goods & Services", examples: "Electronics, IT software, telecom services, restaurants, mineral water, capital goods." },
    { rate: "28%", category: "Luxury & De-merit Goods", examples: "Automobiles, tobacco, aerated drinks, air conditioners, high-end luxury items." },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="GST Billing Guide 2026 — Tax Rules, Invoicing & Slabs in India | CredSmart by CredAlert"
        description="Comprehensive GST billing guide for Indian businesses. Learn how CGST, SGST, and IGST work, mandatory invoice rules, HSN codes, e-Invoicing, and how to file GSTR-1 effortlessly."
        keywords="GST billing guide India, GST invoice rules, CGST SGST calculation, HSN code rules, e-Invoicing thresholds India, GSTR-1 filing guide, free GST invoice software"
        canonicalUrl="https://pos.credalert.bussiness/gst-billing-guide"
        ogType="article"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "GST Guide", url: "/gst-billing-guide" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Educational Knowledge Pillar
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            The Complete Guide to GST Billing &amp; Invoicing in India
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Everything Indian shop owners, wholesalers, and accountants need to know about GST rates, mandatory tax invoice fields, HSN codes, and 1-click GSTR-1 filing.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* GST Slabs Table */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#0A1931]">1. Official GST Rates &amp; Product Slabs</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            GST in India follows a multi-tier tax structure determined by the GST Council. Products and services are classified under five primary rate slabs:
          </p>
          <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="p-4">Tax Rate</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Examples of Goods &amp; Services</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gstSlabs.map((slab, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-amber-700 font-mono">{slab.rate}</td>
                    <td className="p-4 font-semibold text-slate-900">{slab.category}</td>
                    <td className="p-4 text-slate-600">{slab.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CGST vs SGST vs IGST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xs">
              INTRA
            </div>
            <h3 className="text-base font-bold text-[#0A1931]">Intra-State (CGST + SGST)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When the seller and buyer are in the same Indian state. The total GST rate is split equally: 50% Central GST (CGST) and 50% State GST (SGST).
            </p>
            <div className="p-3 rounded-xl bg-slate-50 text-xs font-mono text-slate-700">
              18% GST = 9% CGST + 9% SGST
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-xs">
              INTER
            </div>
            <h3 className="text-base font-bold text-[#0A1931]">Inter-State (IGST)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When goods are sold across state borders or Union Territories. The entire tax amount is levied as Integrated GST (IGST) to the Central Government.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 text-xs font-mono text-slate-700">
              18% GST = 18% IGST
            </div>
          </div>
        </div>

        {/* Mandatory Invoice Requirements */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-xl font-black text-[#0A1931]">2. Mandatory Fields on a Legal GST Tax Invoice</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {[
              "Supplier Name & 15-digit GSTIN",
              "Consecutive Serialized Invoice Number",
              "Date of Invoice Issue",
              "Recipient Name & GSTIN (for B2B)",
              "Place of Supply with State Code",
              "HSN Code for Goods / SAC for Services",
              "Itemized Quantity, Unit & Rate",
              "Taxable Value & Discount Amount",
              "CGST, SGST, IGST Breakdown",
              "Reverse Charge (RCM) applicability",
              "Signature of Authorized Signatory",
              "Dynamic UPI Payment QR Code",
            ].map((field, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-700 p-2.5 rounded-xl bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{field}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Ready to Automate Your GST Billing?"
        highlightedText="100% Free."
        subtitle="CredSmart automatically handles CGST, SGST, IGST calculations, HSN codes, and 1-click GSTR-1 filings."
        ctaText="Start Free GST Billing"
      />
    </PublicLayout>
  );
}
