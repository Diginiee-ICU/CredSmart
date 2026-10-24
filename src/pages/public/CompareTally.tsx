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

export default function CompareTally() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "CredSmart vs Tally Prime",
    description:
      "Detailed comparison between CredSmart and Tally Prime for Indian retail shop owners, wholesalers, and MSMEs looking for modern cloud billing.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };

  const comparisons = [
    {
      feature: "Upfront Software Cost",
      credsmart: "100% Free Forever (₹0)",
      competitor: "₹22,500 + 18% GST (Single User)",
      winner: "credsmart",
      notes: "CredSmart has zero initial license cost and zero annual renewal fees.",
    },
    {
      feature: "Cloud & Multi-Device Access",
      credsmart: "Native Cloud (Browser + Mobile App)",
      competitor: "Desktop Only (Paid TSS Remote addon)",
      winner: "credsmart",
      notes: "Access your store data, generate bills, and review sales reports from any phone, laptop, or tablet.",
    },
    {
      feature: "User Interface & Learning Curve",
      credsmart: "Modern & Intuitive (0 Training Required)",
      competitor: "Complex Keyboard-Heavy Legacy Interface",
      winner: "credsmart",
      notes: "Any cashier or shop staff can start generating bills in 2 minutes.",
    },
    {
      feature: "Thermal POS Receipt Printing",
      credsmart: "Built-in 2\" & 3\" ESC/POS Formatter",
      competitor: "Requires Custom TDL / 3rd-Party Plugins",
      winner: "credsmart",
      notes: "Native support for TVS, Epson, Everycom, and thermal Bluetooth/USB receipt printers.",
    },
    {
      feature: "Barcode Label Designer Studio",
      credsmart: "Included Free in Web App",
      competitor: "Requires Expensive TDL Addons",
      winner: "credsmart",
      notes: "Generate and print custom barcode sticker sheets for retail items directly.",
    },
    {
      feature: "WhatsApp Invoices & Reminders",
      credsmart: "1-Click Direct WhatsApp Integration",
      competitor: "Requires Third-Party SMS/WhatsApp Bridge",
      winner: "credsmart",
      notes: "Send instant PDF bills and Udhar Khata payment reminders to customer WhatsApp.",
    },
    {
      feature: "Official GSTR-1 JSON Schema 2.0",
      credsmart: "Instant 1-Click Export Free",
      competitor: "Requires CA / Tally Audit Module",
      winner: "credsmart",
      notes: "Directly export official GST portal JSON and multi-sheet Excel files for tax filing.",
    },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="CredSmart vs Tally Prime — Free Modern Cloud Alternative | CredSmart by CredAlert"
        description="Comparing CredSmart POS with Tally Prime? Discover why Indian retail and wholesale businesses choose CredSmart for free cloud billing, fast POS checkout, and WhatsApp ledgers."
        keywords="Tally alternative free, CredSmart vs Tally, free cloud billing software India, Tally Prime alternative for retail, free POS software India"
        canonicalUrl="https://pos.credalert.bussiness/compare-tally"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Compare Tally", url: "/compare-tally" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 text-center border-b border-slate-200/80 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-amber-600/20 text-amber-600" /> Modern Cloud Architecture
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            The Modern, Free Cloud Alternative to{" "}
            <span className="text-[#FF6A00]">
              Tally Prime
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Move away from expensive desktop installations and complex shortcut menus. Run your retail shop with modern cloud billing at ₹0 cost.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200/80 shadow-md">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="p-4 sm:p-5">Feature / Comparison</th>
                  <th className="p-4 sm:p-5 text-amber-700 font-bold bg-amber-50/80 border-x border-amber-200">
                    CredSmart (100% Free)
                  </th>
                  <th className="p-4 sm:p-5">Tally Prime (₹22,500+ GST)</th>
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
        title="Ready to Experience Modern Cloud Billing?"
        highlightedText="100% Free Forever."
        subtitle="No server setup, no dongles, and no licensing fees. Start billing in your browser today."
        ctaText="Get Started 100% Free"
      />
    </PublicLayout>
  );
}
