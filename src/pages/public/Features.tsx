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
import { ROUTE_PATHS } from "@/config/routes";

export default function Features() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: "CredSmart POS Features — Complete Free GST Billing & ERP Suite",
    description:
      "Explore the 12 powerful modules of CredSmart POS: POS Billing, GST Invoices, Inventory, Khata Ledgers, Barcode Studio, E-Invoicing, GSTR-1 Tax Exports, and Multi-Branch Management.",
    url: "https://credsmart.in/features",
    publisher: {
      "@type": "Organization",
      name: "CredSmart POS",
      url: "https://credsmart.in",
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
      color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
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
      color: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-400",
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
      color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
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
      color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
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
      color: "from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-400",
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
      color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400",
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
      color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400",
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
      color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400",
    },
    {
      icon: Search,
      badge: "B2B Directory",
      title: "B2B Vendor & Supplier Discovery",
      desc: "Search through 3.2M+ verified MCA and GSTIN registered companies across India. Discover authorized distributors, compare suppliers, and import vendor details instantly.",
      points: [
        "3.2M+ verified Indian company profiles with official MCA data",
        "Instant import of supplier GSTIN and address into your Khata",
        "Direct purchase order creation and invoice matching",
        "Commercial verification and right-of-reply safe harbour",
      ],
      color: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400",
    },
    {
      icon: BarChart3,
      badge: "Executive Insights",
      title: "Real-Time Financial Analytics & P&L",
      desc: "Monitor your store's sales trends, gross profit margins, fast-moving items, and cash & bank liquidity with interactive, real-time visual charts.",
      points: [
        "Daily, weekly, and monthly sales trend charts",
        "Item velocity & top-selling SKU analytics",
        "Payment mode distribution (UPI vs Cash vs Card vs Udhar)",
        "Real-time cash flow & bank liquidity balance tracking",
      ],
      color: "from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-400",
    },
    {
      icon: ShieldCheck,
      badge: "RBAC Security",
      title: "Role-Based Staff Access & Audit Logs",
      desc: "Delegate tasks to your team while protecting sensitive financial data. Create accounts for Store Owners, Managers, and Cashiers with granular permissions.",
      points: [
        "Separate interfaces for Cashiers, Managers, and Owners",
        "Restricted access to financial reports and purchase margins",
        "Timestamped audit logs tracking all deletions, edits, and refunds",
        "256-bit SSL encryption and row-level database security",
      ],
      color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
    },
    {
      icon: Zap,
      badge: "Cloud Sync",
      title: "Universal Cross-Device Cloud Sync",
      desc: "Access your billing, inventory, and Khata from any device. Seamless real-time sync across desktop computers, POS laptops, iPads, tablets, and smartphones.",
      points: [
        "100% cloud-backed with zero data loss risk",
        "Dedicated mobile view with 5-tab bottom navigation",
        "No heavy software installations or manual database backups",
        "Works smoothly even on low-spec hardware and slow internet",
      ],
      color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
    },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="Features — Free GST Billing & POS Software Suite | CredSmart POS"
        description="Discover the complete feature suite of CredSmart POS: Fast POS Billing, GST Invoices, Inventory, Multi-Godown Control, Barcode Generator, Customer Udhar Khata, GSTR-1 Exports, and Multi-Branch Management."
        keywords="POS billing features, GST invoice maker features, inventory management software India, free barcode generator, GSTR-1 export software, multi godown software India, customer khata ledger app"
        canonicalUrl="https://credsmart.in/features"
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> All-In-One Enterprise Architecture
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Everything Your Retail &amp; Wholesale Business Needs.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400">
              100% Free Forever.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate expensive subscriptions. CredSmart POS provides enterprise-grade POS billing, GST compliance, inventory control, and customer Khata ledgers with zero paywalls.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link to={ROUTE_PATHS.auth}>
              <Button className="h-12 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                Start Free Billing Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-xl border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold"
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
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            12 Master Modules Engineered for Growth
          </h2>
          <p className="text-sm text-slate-400">
            From single-counter retail shops to multi-branch distributors, CredSmart scales effortlessly with your commercial demands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.color} border flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>

                  <ul className="space-y-2 pt-2 border-t border-slate-800/80">
                    {feat.points.map((p, pIdx) => (
                      <li
                        key={pIdx}
                        className="text-xs text-slate-300 flex items-start gap-2 leading-tight"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Ready to Upgrade Your Billing Experience?
          </h2>
          <p className="text-sm text-slate-400">
            Join thousands of Indian shop owners and enterprises who trust CredSmart POS. No credit card required. Free forever.
          </p>
          <Link to={ROUTE_PATHS.auth}>
            <Button className="h-12 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-slate-950 font-bold text-sm shadow-xl active:scale-95 transition-all">
              Create Your Free Store Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
