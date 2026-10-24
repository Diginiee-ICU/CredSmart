import { Link } from "react-router-dom";
import {
  Receipt,
  ShoppingCart,
  Package,
  Layers,
  Users2,
  FileSpreadsheet,
  QrCode,
  Building2,
  ShieldCheck,
  Zap,
  Printer,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Search,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function Features() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: "CredSmart Features — Complete Free GST Billing & ERP Suite",
    description:
      "Explore the powerful modules of CredSmart: POS Billing, GST Invoices, Inventory, Khata Ledgers, Barcode Studio, E-Invoicing, GSTR-1 Tax Exports, and Multi-Branch Management.",
    url: "https://pos.credalert.bussiness/features",
    publisher: {
      "@type": "Organization",
      name: "CredSmart by CredAlert",
      url: "https://pos.credalert.bussiness",
    },
  };

  const featureList = [
    {
      icon: ShoppingCart,
      badge: "High-Speed Terminal",
      title: "Retail POS Billing Workbench",
      desc: "Designed for lightning-fast checkout counters. Supports 5 concurrent held bills, barcode scanners, keyboard shortcuts (F1-F12), cash tender calculators, and split payment modes (Cash, UPI, Card, Udhar).",
      points: [
        "Concurrent Held Bills with 1-click restore",
        "Instant Barcode SKU lookup (< 50ms)",
        "Automatic discount & line item price overrides",
        "Quick cash chips (₹100, ₹200, ₹500) calculation",
      ],
      color: "from-amber-500/15 to-orange-500/10 border-amber-500/20 text-amber-600",
    },
    {
      icon: Receipt,
      badge: "GST Tax Engine",
      title: "Official GST Invoicing & Multi-Rate Tax",
      desc: "Generate government-compliant GST tax invoices with automatic CGST, SGST, and IGST breakdowns. Supports composition schemes, intra-state and inter-state transactions, and round-off logic.",
      points: [
        "Full support for 0%, 5%, 12%, 18%, 28% GST slabs",
        "Automated HSN / SAC code resolution",
        "Dynamic UPI Payment QR codes printed directly on invoice",
        "B2B and B2C billing with custom invoice numbering series",
      ],
      color: "from-blue-500/15 to-indigo-500/10 border-blue-500/20 text-blue-600",
    },
    {
      icon: QrCode,
      badge: "Label Studio",
      title: "Barcode & QR Code Label Designer",
      desc: "Create, format, and print custom barcode and price stickers directly from your catalog. Supports thermal roll printers (50x38mm, 38x25mm) and multi-label A4 sheets.",
      points: [
        "Thermal roll printers & standard laser/inkjet A4 sheets (24/40/65 per page)",
        "Customizable item name, barcode, selling price, and MRP",
        "Code 128, EAN-13, and QR Code barcode encoding",
        "Batch print queue synced with purchase invoices",
      ],
      color: "from-emerald-500/15 to-teal-500/10 border-emerald-500/20 text-emerald-600",
    },
    {
      icon: Package,
      badge: "Inventory & Warehouses",
      title: "Inventory & Multi-Godown Warehouse Control",
      desc: "Track stock quantities in real time across multiple retail locations, storage godowns, and warehouses. Set low-stock reorder thresholds and prevent stockouts.",
      points: [
        "Multi-godown stock transfers and tracking",
        "Batch tracking with manufacturing and expiry dates",
        "Stock valuation reports (FIFO / Average Costing)",
        "Low-stock alerts & out-of-stock indicators",
      ],
      color: "from-purple-500/15 to-pink-500/10 border-purple-500/20 text-purple-600",
    },
    {
      icon: Users2,
      badge: "Customer CRM & Khata",
      title: "Customer Udhar Khata & Party Ledgers",
      desc: "Maintain clean, reconciled customer credit ledgers. Track who owes you money, calculate running balances, record partial payments, and send instant WhatsApp payment reminders.",
      points: [
        "Automated Debit / Credit (Dr/Cr) running ledger statements",
        "WhatsApp payment reminders with 1 tap",
        "SharedLedger bilateral balance reconciliation",
        "Credit limits & overdue collection tracking",
      ],
      color: "from-sky-500/15 to-cyan-500/10 border-sky-500/20 text-sky-600",
    },
    {
      icon: FileSpreadsheet,
      badge: "Tax Compliance",
      title: "1-Click GSTR-1 & GSTR-3B Tax Filing",
      desc: "Export official GST Portal Schema 2.0 JSON and Multi-Sheet Excel files ready for direct upload to the GSTN portal or easy sharing with your Chartered Accountant (CA).",
      points: [
        "Official GSTR-1 JSON Schema 2.0 export for GSTN portal",
        "Categorized B2B, B2CL, B2CS, and HSN summary tables",
        "Direct email dispatch to your CA with 1 click",
        "Zero manual data entry during monthly tax filing",
      ],
      color: "from-rose-500/15 to-red-500/10 border-rose-500/20 text-rose-600",
    },
    {
      icon: Printer,
      badge: "Theme Studio",
      title: "Thermal & A4 Invoice Theme Customizer",
      desc: "Customize the look and feel of your bills with 8 modern invoice themes, custom business logos, authorized signatures, custom terms & conditions, and bank payment details.",
      points: [
        "Thermal receipts (2-inch 58mm & 3-inch 80mm ESC/POS compatible)",
        "Full-page A4 and A5 invoice templates",
        "Custom brand colors, company watermark, and signature stamp",
        "Dynamic bank QR codes for instant UPI settlements",
      ],
      color: "from-amber-500/15 to-yellow-500/10 border-amber-500/20 text-amber-600",
    },
    {
      icon: Building2,
      badge: "Enterprise Multi-Store",
      title: "Multi-Branch & Store Management",
      desc: "Manage multiple retail outlets, franchises, or warehouse branches under a single account. Switch between stores in 1 tap on both desktop and mobile.",
      points: [
        "Instant 1-tap store switching on desktop and mobile drawer",
        "Isolated ledger, inventory, and staff permissions per store",
        "Consolidated business overview across all outlets",
        "Zero additional charge per added branch",
      ],
      color: "from-emerald-500/15 to-green-500/10 border-emerald-500/20 text-emerald-600",
    },
    {
      icon: Search,
      badge: "B2B Directory",
      title: "B2B Vendor & Supplier Discovery",
      desc: "Search through 3.2M+ verified MCA and GSTIN registered companies across India. Discover authorized distributors, compare suppliers, and import vendor details instantly.",
      points: [
        "Search 3.2M+ registered Indian businesses by GSTIN, PIN, or name",
        "Instant supplier contact, address, and director profiles",
        "1-click import into your vendor purchase database",
        "Completely free directory access included",
      ],
      color: "from-blue-500/15 to-cyan-500/10 border-blue-500/20 text-blue-600",
    },
    {
      icon: ShieldCheck,
      badge: "Risk Intelligence",
      title: "CredAlert Counterparty Credit Intelligence",
      desc: "Protect your cash flow before offering credit terms. Verify customer and supplier credibility, identify high-risk defaulters, and view commercial credit scores in real time.",
      points: [
        "Automated credit risk ratings on checkout",
        "Early warning indicators for disputed transactions",
        "Secure trade dispute filing & ledger sharing",
        "Enterprise-grade commercial intelligence",
      ],
      color: "from-indigo-500/15 to-purple-500/10 border-indigo-500/20 text-indigo-600",
    },
    {
      icon: BarChart3,
      badge: "Financial Analytics",
      title: "Profit & Loss, Sales & Tax Analytics",
      desc: "Gain deep visibility into your retail operation. Real-time gross margin calculations, top-selling product reports, customer purchase patterns, and cashier performance logs.",
      points: [
        "Daily, weekly, and monthly sales trend dashboards",
        "Net profit and margin breakdown per SKU",
        "Fast-moving vs dead inventory velocity metrics",
        "Exportable Excel and PDF financial statements",
      ],
      color: "from-teal-500/15 to-emerald-500/10 border-teal-500/20 text-teal-600",
    },
    {
      icon: Zap,
      badge: "Cloud Sync & PWA",
      title: "Instant Multi-Device Cloud Synchronization",
      desc: "Seamlessly work across phone, tablet, laptop, and billing PC with real-time Supabase cloud sync. Your data is continuously backed up with 256-bit SSL encryption.",
      points: [
        "100% cloud-backed with zero data loss risk",
        "Dedicated mobile view with 5-tab bottom navigation",
        "No heavy software installations or manual database backups",
        "Works smoothly even on low-spec hardware and slow internet",
      ],
      color: "from-amber-500/15 to-orange-500/10 border-amber-500/20 text-amber-600",
    },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="Features — Free GST Billing & POS Software Suite | CredSmart by CredAlert"
        description="Discover the complete feature suite of CredSmart: Fast POS Billing, GST Invoices, Inventory, Multi-Godown Control, Barcode Generator, Customer Udhar Khata, GSTR-1 Exports, and Multi-Branch Management."
        keywords="POS billing features, GST invoice maker features, inventory management software India, free barcode generator, GSTR-1 export software, multi godown software India, customer khata ledger app"
        canonicalUrl="https://pos.credalert.bussiness/features"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Features", url: "/features" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-200/80">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> All-In-One Enterprise Architecture
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight max-w-4xl mx-auto leading-[1.12]">
            Everything Your Retail &amp; Wholesale Business Needs.{" "}
            <span className="text-[#FF6A00]">
              100% Free Forever.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate expensive subscriptions. CredSmart provides enterprise-grade POS billing, GST compliance, inventory control, and customer Khata ledgers with zero paywalls.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link to={ROUTE_PATHS.auth}>
              <button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8533] hover:from-[#E65F00] hover:to-[#FF6A00] text-white font-bold text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
                Start Free Billing Now <ArrowRight className="w-4 h-4 ml-2 stroke-[2.5]" />
              </button>
            </Link>
            <Link to="/pricing">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-xl border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-sm font-semibold shadow-xs"
              >
                View ₹0 Pricing Breakdown
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 12 Features Grid */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-[#0A1931] tracking-tight">
            12 Master Modules Engineered for Growth
          </h2>
          <p className="text-sm text-slate-600">
            From single-counter retail shops to multi-branch distributors, CredSmart scales effortlessly with your commercial demands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-amber-400/40 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl" />
                <div className="space-y-4 pl-1">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.color} border flex items-center justify-center shadow-xs`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-[#0A1931] group-hover:text-[#FF6A00] transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>

                  <ul className="space-y-2 pt-3 border-t border-slate-100">
                    {feat.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Ready to Upgrade Your Billing Experience?"
        highlightedText="100% Free Forever."
        subtitle="Join thousands of Indian shop owners and enterprises who trust CredSmart. No credit card required."
        ctaText="Create Your Free Store Account"
      />
    </PublicLayout>
  );
}
