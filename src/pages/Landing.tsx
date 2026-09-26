import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Layers,
  ShieldCheck,
  Gift,
  Share2,
  BarChart3,
  Users2,
  Clock,
  Paperclip,
  Network,
  Play,
  Search,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Store,
  Building,
  AlertTriangle,
  RotateCw,
  Plus,
  Download,
  Smartphone,
  Monitor,
  Printer,
  Zap,
  WifiOff,
  ShoppingCart,
  Receipt,
  QrCode,
  Package,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { CredSmartLogo } from "@/components/public/CredSmartLogo";
import { CredAlertShield3D } from "@/components/public/Landing3DIcons";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { SEOHead } from "@/components/public/SEOHead";
import { HeroDashboardCard } from "@/components/public/HeroDashboardCard";
import { AppDownloadButtons } from "@/components/public/AppDownloadButtons";
import { DownloadAppModal } from "@/components/public/DownloadAppModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─────────────────────────── JSON-LD MULTI-SCHEMA ─────────────────────────── */
const structuredDataSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CredSmart by CredAlert",
    url: "https://pos.credalert.bussiness",
    logo: "https://pos.credalert.bussiness/favicon.png",
    description: "India's free GST billing, POS software, and business management platform by CredAlert.",
    sameAs: ["https://www.credalert.business"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CredSmart",
    url: "https://pos.credalert.bussiness",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://pos.credalert.bussiness/discovery?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CredSmart",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS, Windows, macOS",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "2480",
    },
    description:
      "CredSmart by CredAlert is India's all-in-one completely free business management software. Invoicing, POS billing, inventory, purchases, accounting, customer ledger, and credit intelligence.",
    featureList: [
      "100% Free Forever with Zero Hidden Fees",
      "GST Billing with CGST SGST IGST Breakdown",
      "High-Speed POS Retail Checkout & Thermal Printing",
      "Multi-Godown Inventory Management & Low Stock Alerts",
      "Customer Udhar Khata & Digital Payment Ledgers",
      "Business Ecosystem Automated Invoice Exchange",
      "CredAlert Commercial Credit Risk Intelligence",
      "Barcode Label Designer Studio",
      "GSTR-1 Excel and JSON Tax Export",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is CredSmart really completely free forever?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CredSmart is 100% free with no credit card required, no trial expiration, and no hidden charges. Every feature — POS, GST billing, inventory, reports, and ledger — is free forever.",
        },
      },
      {
        "@type": "Question",
        name: "What is the CredSmart Business Ecosystem?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "When both businesses use CredSmart, transactions flow automatically. When you create a sales invoice, it automatically becomes the recipient's purchase invoice with zero manual re-entry.",
        },
      },
      {
        "@type": "Question",
        name: "What is CredAlert Intelligence?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CredAlert Intelligence alerts you if a business counterparty is flagged for commercial disputes, unpaid dues, or risk indicators, helping you protect cash flow and make safe credit decisions.",
        },
      },
      {
        "@type": "Question",
        name: "Does CredSmart support thermal receipt printers and barcode scanners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CredSmart supports all standard 58mm and 80mm ESC/POS thermal printers, barcode scanners, and thermal label sticker printers natively.",
        },
      },
    ],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [ecosystemModalOpen, setEcosystemModalOpen] = useState(false);
  const [credibilityModalOpen, setCredibilityModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadPlatform, setDownloadPlatform] = useState<"android" | "desktop">("android");
  const [searchGstin, setSearchGstin] = useState("");
  const [activeModuleTab, setActiveModuleTab] = useState<
    "pos" | "gst" | "barcode" | "inventory" | "khata" | "reports"
  >("pos");
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const targetAppRoute = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;

  const handleStartFree = () => {
    if (user) {
      navigate(targetAppRoute);
    } else {
      navigate(`${ROUTE_PATHS.auth}?mode=signup`);
    }
  };

  const handleCredibilitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchGstin.trim()) {
      navigate(`${ROUTE_PATHS.discovery}?q=${encodeURIComponent(searchGstin.trim())}`);
    } else {
      navigate(ROUTE_PATHS.discovery);
    }
  };

  const handleOpenDownload = (platform: "android" | "desktop") => {
    setDownloadPlatform(platform);
    setDownloadModalOpen(true);
  };

  // Module showcase items
  const moduleShowcases = {
    pos: {
      badge: "Fast Checkout Terminal",
      title: "Lightning-Fast Retail POS Billing",
      desc: "Process rush-hour customer queues with keyboard shortcuts (F1-F12), held bill stacks, instant barcode lookup, and split payments.",
      points: [
        "Concurrent Held Bills with 1-click restore",
        "Barcode scanner & item SKU lookup (< 50ms)",
        "Split cash, UPI, card & Udhar credit tender",
        "Direct thermal printing on 58mm & 80mm rolls",
      ],
      tag: "POS Workbench",
      badgeColor: "bg-blue-100 text-blue-800",
    },
    gst: {
      badge: "Tax Compliant",
      title: "Automated GST Invoicing & UPI QR",
      desc: "Create official tax invoices with automatic CGST, SGST, IGST calculations, HSN code lookups, and dynamic payment QR codes.",
      points: [
        "Supports 0%, 5%, 12%, 18%, 28% GST slabs",
        "Automatic intra-state & inter-state tax engine",
        "Dynamic UPI payment QR printed on bill",
        "B2B and B2C custom invoice series",
      ],
      tag: "GST Invoicing",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    barcode: {
      badge: "Label Studio",
      title: "Custom Barcode & Sticker Generator",
      desc: "Design and print custom barcode price tags directly from your product catalog on thermal sticker rolls or A4 label sheets.",
      points: [
        "Thermal roll sizes: 50x38mm, 38x25mm & custom",
        "Standard laser/inkjet A4 sheets (24/40 labels)",
        "Code 128, EAN-13, and QR Code generation",
        "Batch print queue synced with purchase bills",
      ],
      tag: "Barcode Studio",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    inventory: {
      badge: "Warehouse Control",
      title: "Multi-Godown Stock & Batch Tracking",
      desc: "Track inventory quantities in real time across multiple retail godowns, batch expiry dates, and low-stock reorder thresholds.",
      points: [
        "Multi-godown stock transfers and tracking",
        "Batch tracking with MFG and Expiry dates",
        "Stock valuation reports (FIFO / Average Cost)",
        "Automatic low-stock SMS and push alerts",
      ],
      tag: "Inventory",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    khata: {
      badge: "Customer CRM",
      title: "Digital Udhar Khata & WhatsApp Alerts",
      desc: "Maintain clean party ledgers, track receivables, record partial payments, and send instant WhatsApp payment reminder links.",
      points: [
        "Customer & supplier running credit balance",
        "1-click WhatsApp payment reminders with bill PDF",
        "Cryptographically reconciled ledger audit trails",
        "Credit limit enforcement per party",
      ],
      tag: "Udhar Khata",
      badgeColor: "bg-orange-100 text-orange-800",
    },
    reports: {
      badge: "CA Ready",
      title: "GSTR-1 JSON & Excel Tax Reports",
      desc: "Export 100% government-compliant GSTR-1 JSON Schema 2.0 files and detailed Excel audit sheets for your CA in seconds.",
      points: [
        "GSTR-1 B2B, B2CL, B2CS, and HSN summary export",
        "Profit & loss, sales summary, and tax registers",
        "Tally XML import & export bridge compatibility",
        "1-click CA sharing link with password protection",
      ],
      tag: "Tax Reports",
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
  };

  // FAQ list
  const faqs = [
    {
      q: "Is CredSmart really 100% free forever? Are there any hidden fees?",
      a: "Yes, CredSmart is genuinely 100% free forever. There are zero subscription fees, zero limits on invoices or items, zero watermarks on your bills, and no credit card is ever required. Our platform is backed by CredAlert's commercial enterprise network.",
    },
    {
      q: "Does CredSmart support thermal receipt printers and barcode scanners?",
      a: "Yes. CredSmart natively supports all standard 58mm and 80mm ESC/POS thermal printers via USB, Bluetooth, LAN, and Wi-Fi, as well as plug-and-play USB barcode scanners and mobile camera scanning.",
    },
    {
      q: "What is the CredSmart Business Ecosystem?",
      a: "When both businesses use CredSmart, transactions flow automatically. When you create a sales invoice, it automatically registers in the recipient's purchase invoice ledger with zero manual re-typing and zero reconciliation errors.",
    },
    {
      q: "What is CredAlert Intelligence and how does it protect my shop?",
      a: "CredAlert Intelligence alerts you if a commercial customer or counterparty has a history of commercial payment defaults or registered disputes across our database of 3.2M+ Indian entities, helping you avoid bad debts and safe credit terms.",
    },
    {
      q: "Can I use CredSmart offline without an active internet connection?",
      a: "Yes. Both our Android App and Windows Desktop App feature full offline billing modes. You can continue creating bills and receipts without internet, and the system automatically syncs with the cloud once reconnected.",
    },
    {
      q: "Can I migrate my existing items and parties from Vyapar, myBillBook, or Tally?",
      a: "Yes. CredSmart features a 1-click Excel/CSV importer and a native Tally XML bridge that imports your complete item catalog, customer contacts, and opening stock balances in under 60 seconds.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <>
      <SEOHead
        title="CredSmart by CredAlert — Free GST Billing, POS & Business Software"
        description="India's all-in-one completely free business management platform. Invoicing, POS billing, inventory, purchases, accounting, customer ledger, and credit intelligence. Download for Android & Desktop."
        keywords="free GST billing software India, free POS software India, download billing app android, download pos desktop windows, GST invoice generator free, Vyapar alternative free, myBillBook alternative free, retail billing software, CredAlert credit risk intelligence"
        canonicalUrl="https://pos.credalert.bussiness/"
        structuredData={structuredDataSchemas}
      />

      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#FF6A00] selection:text-white">
        
        {/* ── TOP NAVIGATION HEADER ── */}
        <PublicHeader onOpenDownloadModal={handleOpenDownload} />

        {/* ── SECTION 1: MASTER HERO SECTION (Split Layout matching Design Standard) ── */}
        <section className="relative pt-8 sm:pt-14 pb-16 lg:pb-24 overflow-hidden border-b border-slate-200/70">
          {/* Subtle Ambient Background Mesh Gradients */}
          <div className="absolute top-0 right-1/4 w-[650px] h-[650px] bg-gradient-to-bl from-blue-200/40 via-indigo-100/30 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-orange-200/30 via-amber-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-center">
              
              {/* ── LEFT COLUMN: VALUE PROPOSITION & DOWNLOAD BUTTONS ── */}
              <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
                
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 text-blue-700 text-xs sm:text-sm font-semibold mb-6 shadow-2xs">
                  <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
                  <span>All-in-One Business Management Software</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-[#0F172A] leading-[1.1] mb-5">
                  Everything Your Business Needs. <br />
                  <span className="text-[#FF6A00]">Completely Free.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6 max-w-xl">
                  Invoicing, POS, Inventory, Purchases, Accounting &amp; more — one powerful platform to run your entire business with zero paywalls.
                </p>

                {/* 3 Horizontal Feature Badges */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 mb-7">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/90 border border-blue-100 text-slate-800 text-xs font-bold shadow-2xs">
                    <span className="text-blue-600 text-sm">🎁</span>
                    <span>100% Free Forever</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-100 text-slate-800 text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All Features Included</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50/90 border border-orange-100 text-slate-800 text-xs font-bold shadow-2xs">
                    <span className="text-orange-600 text-sm">👥</span>
                    <span>For Every Business</span>
                  </div>
                </div>

                {/* Primary Dual Action Buttons (Web) */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-6">
                  <button
                    type="button"
                    onClick={handleStartFree}
                    className="w-full sm:w-auto h-12 sm:h-13 px-7 sm:px-8 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-700/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Start Free Now</span>
                    <span className="text-lg">🚀</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoModalOpen(true)}
                    className="w-full sm:w-auto h-12 sm:h-13 px-6 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-sm sm:text-base active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Explore CredSmart</span>
                    <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center">
                      <Play className="w-2.5 h-2.5 fill-slate-700 text-slate-700 ml-0.5" />
                    </div>
                  </button>
                </div>

                {/* ── DEDICATED APP DOWNLOAD BUTTONS (1 FOR ANDROID, 1 FOR DESKTOP) ── */}
                <div className="w-full max-w-md pt-2 pb-6 border-t border-slate-200/80">
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Download Official Apps
                    </span>
                  </div>
                  <AppDownloadButtons
                    onSelectPlatform={handleOpenDownload}
                    variant="hero"
                    align="left"
                  />
                </div>

                {/* Trust Checklist Row */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    No Credit Card Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    Easy to Use
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    Setup in Minutes
                  </span>
                </div>

              </div>

              {/* ── RIGHT COLUMN: INTERACTIVE LIVE DASHBOARD PREVIEW CARD ── */}
              <div className="lg:col-span-6 w-full">
                <HeroDashboardCard onStartFree={handleStartFree} />
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 2: "WHY BUSINESSES LOVE CREDSMART" (6-Card Grid) ── */}
        <section id="features" className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Why Businesses Love <span className="text-[#FF6A00]">CredSmart</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Everything required to digitize billing, speed up counter sales, and secure customer credit.
              </p>
            </div>

            {/* 6 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
              
              {/* 1. Complete & Free */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4 shadow-2xs">
                  🎁
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Complete &amp; Free
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Use every feature. Forever. No hidden charges. No limits.
                </p>
              </div>

              {/* 2. All-in-One Platform */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  All-in-One Platform
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Invoicing, POS, Inventory, Sales, Purchases, Accounting – everything in one place.
                </p>
              </div>

              {/* 3. Business Ecosystem */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 shadow-2xs">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Business Ecosystem
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your sales invoice can automatically become their purchase invoice.
                </p>
              </div>

              {/* 4. CredAlert Intelligence */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  CredAlert Intelligence
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Know the credibility of the businesses you deal with. Stay protected.
                </p>
              </div>

              {/* 5. Real-time Insights */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-2xs">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Real-time Insights
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Live financial dashboard. Track collections, payments &amp; cash flow in real-time.
                </p>
              </div>

              {/* 6. Built for Every Business */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 shadow-2xs">
                  <Users2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Built for Every Business
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Retailers, Wholesalers, Distributors, Manufacturers, Service Businesses &amp; more.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ── SECTION 3: DUAL BENTO SPOTLIGHT CARDS (Ecosystem & CredAlert Intelligence) ── */}
        <section className="py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* ── Left Bento Card: The CredSmart Business Ecosystem ── */}
              <div
                id="ecosystem"
                className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                    The <span className="text-[#FF6A00]">CredSmart</span> Business Ecosystem
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                    When both businesses use CredSmart, transactions flow automatically. No duplicate entry. No extra work. Just connected businesses.
                  </p>

                  {/* Flow Diagram */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-5 mb-6">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                      
                      {/* Business A Node */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs mb-2">
                          <Store className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Business A</span>
                        <span className="text-[10px] text-slate-500 font-medium">Creates Sales Invoice</span>
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center text-blue-500 font-bold px-2">
                        <ArrowRight className="w-5 h-5 animate-pulse" />
                      </div>

                      {/* CredSmart Ecosystem Center */}
                      <div className="flex flex-col items-center text-center">
                        <div className="px-3 py-2 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-extrabold text-xs shadow-md mb-2 flex items-center gap-1.5">
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>CredSmart Ecosystem</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">Auto-Reconciled</span>
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center text-blue-500 font-bold px-2">
                        <ArrowRight className="w-5 h-5 animate-pulse" />
                      </div>

                      {/* Business B Node */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs mb-2">
                          <Building className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Business B</span>
                        <span className="text-[10px] text-slate-500 font-medium">Receives as Purchase Invoice</span>
                      </div>

                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setEcosystemModalOpen(true)}
                      className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
                    >
                      Learn More
                    </button>
                  </div>
                </div>

                {/* 3 Perks Row at Bottom of Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-100 text-xs">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Save Time</div>
                      <div className="text-slate-500 text-[11px]">No manual data entry</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Paperclip className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Reduce Errors</div>
                      <div className="text-slate-500 text-[11px]">Eliminate duplicate data</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Network className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Stronger Network</div>
                      <div className="text-slate-500 text-[11px]">Grow with connected businesses</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Right Bento Card: CredAlert Intelligence ── */}
              <div
                id="intelligence"
                className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  
                  {/* Left info column inside the right card */}
                  <div className="sm:col-span-7 flex flex-col items-start">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                      CredAlert <span className="text-[#FF6A00]">Intelligence</span>
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                      Get alerted if a business is flagged as a potential defaulter or risky counterparty by our CredAlert Intelligence system. Make smarter credit decisions. Reduce risk.
                    </p>

                    <button
                      type="button"
                      onClick={() => setCredibilityModalOpen(true)}
                      className="px-6 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-sm transition-colors cursor-pointer mb-4 inline-flex items-center gap-1.5"
                    >
                      <span>Check Business Credibility</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <p className="text-xs text-slate-500 font-medium">
                      For more details visit{" "}
                      <a
                        href="https://www.credalert.business"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        www.credalert.business
                      </a>
                    </p>
                  </div>

                  {/* Right 3D Shield Graphic inside the right card */}
                  <div className="sm:col-span-5 flex items-center justify-center">
                    <CredAlertShield3D />
                  </div>

                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <ShieldCheck className="w-4 h-4" /> Real-time Default Risk Alerts
                  </span>
                  <span>MCA &amp; GST Registered Database</span>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 4: INTERACTIVE MODULE SHOWCASE TABS ── */}
        <section className="py-14 sm:py-20 bg-white border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">
                Complete Toolset Included
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1.5">
                Every Module Built for <span className="text-[#FF6A00]">Indian Retail &amp; MSMEs</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Click below to explore each enterprise module included 100% free with no limits.
              </p>
            </div>

            {/* Tab Buttons Strip */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {[
                { id: "pos", label: "POS Terminal", icon: ShoppingCart },
                { id: "gst", label: "GST Invoicing", icon: Receipt },
                { id: "barcode", label: "Barcode Studio", icon: QrCode },
                { id: "inventory", label: "Inventory & Godowns", icon: Package },
                { id: "khata", label: "Udhar Khata", icon: Users2 },
                { id: "reports", label: "CA Reports", icon: FileSpreadsheet },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeModuleTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModuleTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border",
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105"
                        : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Spotlight Panel */}
            {(() => {
              const current = moduleShowcases[activeModuleTab];
              return (
                <div className="rounded-3xl bg-slate-50/80 border border-slate-200/90 p-6 sm:p-10 shadow-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Left text column */}
                    <div className="lg:col-span-7 space-y-4">
                      <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono", current.badgeColor)}>
                        {current.badge}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                        {current.title}
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                        {current.desc}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {current.points.map((pt, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 flex items-center gap-3">
                        <Button
                          onClick={handleStartFree}
                          className="h-11 px-6 rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white font-bold"
                        >
                          Try {current.tag} Free 🚀
                        </Button>
                        <Link to={ROUTE_PATHS.features}>
                          <Button variant="outline" className="h-11 px-5 rounded-xl border-slate-300">
                            Explore All Features &rarr;
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Right interactive visual simulation */}
                    <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">
                          Live Module Preview
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Active
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Active Counter:</span>
                          <span className="font-bold text-slate-900">Main Retail Counter 01</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Hardware Status:</span>
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <Printer className="w-3 h-3" /> Thermal 80mm ESC/POS Ready
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Offline Sync:</span>
                          <span className="font-bold text-blue-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Zero-Lag Background Sync
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                        <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>Instant keyboard shortcuts enabled: Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-blue-200 font-mono text-[10px]">F8</kbd> to tender cash or <kbd className="px-1.5 py-0.5 bg-white rounded border border-blue-200 font-mono text-[10px]">Enter</kbd> to print receipt.</span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

          </div>
        </section>

        {/* ── SECTION 5: DEDICATED NATIVE APPS SHOWCASE & DOWNLOAD HUB (1 Android, 1 Desktop) ── */}
        <section id="download" className="py-14 sm:py-20 bg-slate-100/70 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold font-mono uppercase tracking-wider mb-3">
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Native Multi-Platform Downloads</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Run CredSmart on Any Device. <span className="text-[#FF6A00]">100% Free.</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Download high-performance native apps for Android smartphones, tablets, and Windows PC. Works offline with seamless cloud sync.
              </p>
            </div>

            {/* 2 Showcase Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* ── CARD 1: ANDROID APP (Button 1 for Android) ── */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold font-mono tracking-wider">
                      ANDROID MOBILE &amp; TABLET
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      v1.1.4 (APK)
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                    <Smartphone className="w-6 h-6 text-emerald-600" />
                    <span>CredSmart for Android</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    Designed for high-speed counter billing and on-the-go business operations. Transform any Android smartphone or tablet into a full-fledged POS machine.
                  </p>

                  <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Camera Barcode Scanner with flashlight support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Direct Bluetooth thermal receipt printing (58mm &amp; 80mm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>1-click WhatsApp customer payment reminders with PDF bill</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% offline billing mode with automatic cloud sync</span>
                    </div>
                  </div>
                </div>

                {/* Android Download Action */}
                <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Android 8.0+ &bull; 28 MB &bull; Free</span>
                  </div>

                  <Button
                    onClick={() => handleOpenDownload("android")}
                    className="w-full sm:w-auto h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download for Android (.apk)</span>
                  </Button>
                </div>
              </div>

              {/* ── CARD 2: DESKTOP APP (Button 2 for Desktop) ── */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold font-mono tracking-wider">
                      WINDOWS PC DESKTOP
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      v1.1.4 (x64)
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                    <Monitor className="w-6 h-6 text-blue-600" />
                    <span>CredSmart for Windows</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    Engineered for high-volume billing counters, wholesale distribution warehouses, and zero-latency retail checkouts.
                  </p>

                  <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Ultra-fast F1-F12 keyboard POS shortcuts for cashiers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Direct USB, LAN &amp; Virtual COM thermal receipt printer drivers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Dual-screen customer display support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Local SQLite offline engine &bull; zero internet downtime</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Download Action */}
                <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Windows 10/11 &bull; 45 MB &bull; 64-bit</span>
                  </div>

                  <Button
                    onClick={() => handleOpenDownload("desktop")}
                    className="w-full sm:w-auto h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download for Windows (.exe)</span>
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 6: COMPARISON MATRIX (CredSmart vs Vyapar vs myBillBook vs Tally) ── */}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-widest font-mono">
                The ₹0 Advantage
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                How CredSmart Compares with <span className="text-[#FF6A00]">Paid Alternatives</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Why thousands of shop owners are switching from paid renewal software to CredSmart.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-4 px-5 font-bold">Feature / Capability</th>
                    <th className="py-4 px-5 font-black text-amber-300 bg-slate-800/90 border-x border-slate-700">
                      CredSmart (100% Free)
                    </th>
                    <th className="py-4 px-5 font-semibold text-slate-300">Vyapar</th>
                    <th className="py-4 px-5 font-semibold text-slate-300">myBillBook</th>
                    <th className="py-4 px-5 font-semibold text-slate-300">Tally Prime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-5 font-bold text-slate-900">Annual License Fee</td>
                    <td className="py-3.5 px-5 font-black text-emerald-600 bg-emerald-50/60 border-x border-emerald-100">
                      ₹ 0 / Forever
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">₹ 2,999 - ₹ 4,999 / yr</td>
                    <td className="py-3.5 px-5 text-slate-600">₹ 2,599 - ₹ 6,999 / yr</td>
                    <td className="py-3.5 px-5 text-slate-600">₹ 22,500 + GST</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-5 font-bold text-slate-900">Invoice Limit</td>
                    <td className="py-3.5 px-5 font-black text-emerald-600 bg-emerald-50/60 border-x border-emerald-100">
                      Unlimited
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">Limited in Basic Plan</td>
                    <td className="py-3.5 px-5 text-slate-600">Limited in Basic Plan</td>
                    <td className="py-3.5 px-5 text-slate-600">Unlimited</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-5 font-bold text-slate-900">Barcode Label Studio</td>
                    <td className="py-3.5 px-5 font-black text-emerald-600 bg-emerald-50/60 border-x border-emerald-100">
                      Included Free
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">Paid Desktop Only</td>
                    <td className="py-3.5 px-5 text-slate-600">Paid Addon</td>
                    <td className="py-3.5 px-5 text-slate-600">Requires 3rd Party Plugin</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-5 font-bold text-slate-900">Multi-Device Cloud Sync</td>
                    <td className="py-3.5 px-5 font-black text-emerald-600 bg-emerald-50/60 border-x border-emerald-100">
                      Instant Real-time
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">Paid Google Drive Sync</td>
                    <td className="py-3.5 px-5 text-slate-600">Cloud Included</td>
                    <td className="py-3.5 px-5 text-slate-600">Paid TSS Remote</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-5 font-bold text-slate-900">Commercial Credit Risk Intel</td>
                    <td className="py-3.5 px-5 font-black text-emerald-600 bg-emerald-50/60 border-x border-emerald-100">
                      Included by CredAlert
                    </td>
                    <td className="py-3.5 px-5 text-slate-400">Not Available</td>
                    <td className="py-3.5 px-5 text-slate-400">Not Available</td>
                    <td className="py-3.5 px-5 text-slate-400">Not Available</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-5 font-bold text-slate-900">Native Android &amp; Desktop Apps</td>
                    <td className="py-3.5 px-5 font-black text-emerald-600 bg-emerald-50/60 border-x border-emerald-100">
                      Free Direct Download
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">Separate paid licenses</td>
                    <td className="py-3.5 px-5 text-slate-600">Separate tier pricing</td>
                    <td className="py-3.5 px-5 text-slate-600">Desktop only</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-center">
              <Link to={ROUTE_PATHS.pricing}>
                <Button variant="outline" className="rounded-xl border-slate-300 font-semibold text-xs sm:text-sm">
                  View Full Detailed Pricing Breakdown &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: SOCIAL PROOF & METRICS STRIP ── */}
        <section className="py-12 bg-slate-900 text-white border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                  50,000+
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  Invoices Generated
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-blue-400 font-mono">
                  ₹ 100 Cr+
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  Reconciled GMV
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                  99.99%
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  Cloud Uptime
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-[#FF6A00] font-mono">
                  4.9 / 5.0
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  User Rating
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: INTERACTIVE FAQ ACCORDION WITH SEARCH ── */}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">
                Got Questions?
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                Frequently Asked <span className="text-[#FF6A00]">Questions</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Clear answers regarding our 100% free model, offline billing, hardware, and data security.
              </p>

              {/* FAQ Search Filter */}
              <div className="mt-6 max-w-md mx-auto relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search questions (e.g. offline, printer, pricing)..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Accordion items */}
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180 text-blue-600"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ── SECTION 9: HIGH-CONVERSION BOTTOM BANNER (With Web & Download CTAs) ── */}
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-8 sm:p-12 shadow-2xl text-white flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
              
              {/* Backglow accents */}
              <div className="absolute right-0 bottom-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-0 top-0 w-60 h-60 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Left Content */}
              <div className="flex items-center gap-5 text-left z-10">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-2xl sm:text-3xl shadow-xl shrink-0">
                  🚀
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                    Run Your Entire Business. <span className="text-amber-300">For Free.</span>
                  </h3>
                  <p className="text-sm sm:text-base text-blue-100 mt-1 max-w-xl font-medium">
                    Stop juggling multiple tools and paying annual subscription renewals. Start using CredSmart today.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-blue-100">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Complete Solution
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> All Features Free
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Android &amp; Windows Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Right CTA Cluster */}
              <div className="shrink-0 w-full sm:w-auto z-10 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartFree}
                  className="w-full sm:w-auto h-13 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-800 font-black text-sm sm:text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">🚀</span>
                  <span>Start Free Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDownload("android")}
                  className="w-full sm:w-auto h-13 px-6 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-white border border-white/20 font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-300" />
                  <span>Download Apps</span>
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* ── PUBLIC FOOTER ── */}
        <PublicFooter />

        {/* ── MODALS FOR INTERACTIVE EXPLORATION ── */}
        
        {/* 1. Video Tour Modal */}
        <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
          <DialogContent className="max-w-3xl p-6 rounded-2xl bg-white text-slate-900 border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <CredSmartLogo size="sm" showTagline={false} />
                <span>Interactive Product Overview</span>
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                See how fast you can create GST invoices, manage POS billing, and automate ledger reconciliation with zero setup fees.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 rounded-xl overflow-hidden bg-slate-950 aspect-video flex flex-col items-center justify-center text-white p-6 relative border border-slate-800">
              <div className="w-16 h-16 rounded-full bg-[#FF6A00] flex items-center justify-center shadow-xl animate-pulse cursor-pointer">
                <Play className="w-7 h-7 fill-white text-white ml-1" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-200">CredSmart 2-Minute Guided Tour</p>
              <p className="text-xs text-slate-400">GST Billing &bull; Barcode POS &bull; Inventory &amp; Ledgers</p>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setVideoModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setVideoModalOpen(false);
                  handleStartFree();
                }}
                className="bg-[#FF6A00] hover:bg-[#E65F00] text-white font-bold"
              >
                Get Started Free Now 🚀
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2. Ecosystem Modal */}
        <Dialog open={ecosystemModalOpen} onOpenChange={setEcosystemModalOpen}>
          <DialogContent className="max-w-2xl p-6 rounded-2xl bg-white text-slate-900 border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                The CredSmart Business Ecosystem
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                How automatic connected billing eliminates manual accounting errors.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4 text-sm text-slate-700">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                <span className="text-xl">1️⃣</span>
                <div>
                  <h4 className="font-bold text-slate-900">Direct Invoicing Sync</h4>
                  <p className="text-xs text-slate-600 mt-0.5">When you issue a GST invoice to another business using CredSmart, it instantly registers in their purchase ledger for one-click verification.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
                <span className="text-xl">2️⃣</span>
                <div>
                  <h4 className="font-bold text-slate-900">Zero Re-Entry &amp; Reconciliation</h4>
                  <p className="text-xs text-slate-600 mt-0.5">HSN codes, batch numbers, rates, and GST taxes match automatically, preventing tax credit discrepancies.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3">
                <span className="text-xl">3️⃣</span>
                <div>
                  <h4 className="font-bold text-slate-900">Unified Payment &amp; Credit Ledger</h4>
                  <p className="text-xs text-slate-600 mt-0.5">Track Udhar, credit cycles, and payment receipts with cryptographically verified transaction receipts.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEcosystemModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setEcosystemModalOpen(false);
                  handleStartFree();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Join the Ecosystem
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. Check Business Credibility Modal */}
        <Dialog open={credibilityModalOpen} onOpenChange={setCredibilityModalOpen}>
          <DialogContent className="max-w-xl p-6 rounded-2xl bg-white text-slate-900 border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <span>CredAlert Intelligence Check</span>
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Search any Indian business by GSTIN, PAN, or Company Name to verify default records and commercial credibility.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCredibilitySearch} className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Business Name, GSTIN or PAN
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchGstin}
                    onChange={(e) => setSearchGstin(e.target.value)}
                    placeholder="e.g. 27AABCU9603R1ZM or Tata Motors"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>CredAlert indexes over 3.2M+ registered companies and commercial payment track records across India.</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setCredibilityModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  Check Credibility Now
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 4. DEDICATED NATIVE APP DOWNLOAD MODAL (Android & Desktop) */}
        <DownloadAppModal
          open={downloadModalOpen}
          onOpenChange={setDownloadModalOpen}
          defaultPlatform={downloadPlatform}
        />

      </div>
    </>
  );
}
