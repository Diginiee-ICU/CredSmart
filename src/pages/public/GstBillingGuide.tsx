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
import { ROUTE_PATHS } from "@/config/routes";

export default function GstBillingGuide() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "The Complete Guide to GST Billing & Invoicing in India (2026)",
    description:
      "A comprehensive guide for Indian retail and wholesale businesses on GST rules, CGST/SGST/IGST calculation, HSN/SAC codes, e-Invoicing, and GSTR-1 tax compliance.",
    author: {
      "@type": "Organization",
      name: "CredSmart POS Research Team",
    },
    publisher: {
      "@type": "Organization",
      name: "CredSmart POS",
      logo: {
        "@type": "ImageObject",
        url: "https://credsmart.in/favicon.png",
      },
    },
    datePublished: "2026-01-01",
    dateModified: "2026-08-22",
  };

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
        title="GST Billing Guide 2026 — Tax Rules, Invoicing & Slabs in India | CredSmart"
        description="Comprehensive GST billing guide for Indian businesses. Learn how CGST, SGST, and IGST work, mandatory invoice rules, HSN codes, e-Invoicing, and how to file GSTR-1 effortlessly."
        keywords="GST billing guide India, GST invoice rules, CGST SGST calculation, HSN code rules, e-Invoicing thresholds India, GSTR-1 filing guide, free GST invoice software"
        canonicalUrl="https://credsmart.in/gst-billing-guide"
        ogType="article"
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" /> Educational Knowledge Pillar
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            The Complete Guide to GST Billing &amp; Invoicing in India
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Everything Indian shop owners, wholesalers, and accountants need to know about GST rates, mandatory tax invoice fields, HSN codes, and 1-click GSTR-1 filing.
          </p>
        </div>
      </section>

      {/* Main Content Article */}
      <article className="py-16 max-w-4xl mx-auto px-4 space-y-12 text-slate-300 text-sm sm:text-base leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-400" />
            1. Understanding the Three Types of GST
          </h2>
          <p>
            Under the Indian Goods and Services Tax (GST) framework, tax is levied based on whether a transaction is <strong>Intra-State</strong> (within the same state) or <strong>Inter-State</strong> (between different states or union territories):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 font-mono">CGST (Central GST)</span>
              <p className="text-xs text-slate-400">
                Levied by the Central Government on intra-state supplies. Appears as 50% of the total tax rate (e.g., 9% on an 18% slab).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-indigo-400 font-mono">SGST / UTGST (State GST)</span>
              <p className="text-xs text-slate-400">
                Levied by the State or Union Territory Government on intra-state supplies, matching CGST equally.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 font-mono">IGST (Integrated GST)</span>
              <p className="text-xs text-slate-400">
                Levied by the Central Government on all inter-state supplies, export/import of goods, equal to CGST + SGST combined.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" />
            2. Mandatory Fields on a Legal GST Tax Invoice
          </h2>
          <p>
            According to Rule 46 of the CGST Rules, a valid GST tax invoice must include the following statutory components:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              "Supplier Legal Name, Registered Address, and GSTIN",
              "Consecutive serial number (unique for each financial year)",
              "Date of issue of the invoice",
              "Customer Name, Address, and GSTIN (for B2B transactions)",
              "HSN code (4 or 6 digits) for goods or SAC code for services",
              "Description of goods or services, quantity, and unit of measure",
              "Total value of supply and taxable value after discounts",
              "Rate of tax (CGST, SGST, IGST) and corresponding tax amount",
              "Place of Supply along with State Name and Code",
              "Digital signature or physical signature of the authorized person",
            ].map((field, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{field}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-emerald-400" />
            3. Standard GST Slabs in India
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Rate</th>
                  <th className="p-4">Classification</th>
                  <th className="p-4">Typical Goods / Services</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {gstSlabs.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-amber-400">{s.rate}</td>
                    <td className="p-4 font-semibold text-slate-200">{s.category}</td>
                    <td className="p-4 text-slate-400 text-xs">{s.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-rose-400" />
            4. How CredSmart POS Automates GST Compliance
          </h2>
          <p>
            Manually calculating taxes, sorting out HSN codes, and preparing monthly GSTR-1 summaries is tedious and error-prone. CredSmart POS fully automates every step:
          </p>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <p className="text-slate-200 font-semibold">
              Automatic Tax Splits &amp; 1-Click JSON Filing
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              When you bill a customer, CredSmart automatically checks their state code against your store&apos;s registered GSTIN, calculating CGST/SGST or IGST in real time. At the end of the month, export the official <strong>GSTR-1 JSON Schema 2.0</strong> file for immediate upload to the GST Portal—saving hours of manual bookkeeping.
            </p>
            <div className="pt-2">
              <Link to={ROUTE_PATHS.auth}>
                <Button className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-md">
                  Create Your First GST Invoice Free <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </article>
    </PublicLayout>
  );
}
