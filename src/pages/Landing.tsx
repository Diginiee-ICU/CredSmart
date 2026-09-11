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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { CredSmartLogo } from "@/components/public/CredSmartLogo";
import {
  Collect3DIcon,
  Pay3DIcon,
  Bank3DIcon,
  CredAlertShield3D,
} from "@/components/public/Landing3DIcons";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { SEOHead } from "@/components/public/SEOHead";
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
  const [searchGstin, setSearchGstin] = useState("");

  const targetAppRoute = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;

  const handleStartFree = () => {
    if (user) {
      navigate(targetAppRoute);
    } else {
      navigate(`${ROUTE_PATHS.auth}?mode=signup`);
    }
  };

  const handleLogin = () => {
    if (user) {
      navigate(targetAppRoute);
    } else {
      navigate(`${ROUTE_PATHS.auth}?mode=login`);
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

  return (
    <>
      <SEOHead
        title="CredSmart by CredAlert — Free GST Billing & POS Software for Indian Businesses"
        description="India's all-in-one completely free business management platform. Invoicing, POS billing, inventory, purchases, accounting, customer ledger, and credit intelligence. 100% free forever."
        keywords="free GST billing software India, free POS software India, GST invoice software free, Vyapar alternative free, myBillBook alternative free, free retail billing software, kirana store billing software, CredAlert credit risk intelligence"
        canonicalUrl="https://pos.credalert.bussiness/"
        structuredData={structuredDataSchemas}
      />

      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#FF6A00] selection:text-white">
        {/* ── TOP NAVIGATION HEADER (Matching Reference Exactly) ── */}
        <PublicHeader />

        {/* ── HERO SECTION ── */}
        <section className="relative pt-10 sm:pt-16 pb-16 lg:pb-24 overflow-hidden text-center border-b border-slate-200/70">
          {/* Subtle Ambient Background Mesh Gradient */}
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-bl from-blue-200/40 via-indigo-100/30 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-[450px] h-[450px] bg-gradient-to-tr from-orange-200/30 via-amber-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-200/80 bg-blue-50/70 text-blue-700 text-xs sm:text-sm font-medium mb-6 shadow-xs">
              <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
              <span>All-in-One Business Management Software</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-black tracking-tight text-[#0F172A] leading-[1.1] mb-6">
              Everything Your Business Needs. <br />
              <span className="text-[#FF6A00]">Completely Free.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-2xl">
              Invoicing, POS, Inventory, Purchases, Accounting &amp; more — one powerful platform to run your entire business with zero paywalls.
            </p>

            {/* 3 Horizontal Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50/80 border border-blue-100 text-slate-800 text-xs sm:text-sm font-bold shadow-xs">
                <span className="text-blue-600 text-base">🎁</span>
                <span>100% Free Forever</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-100 text-slate-800 text-xs sm:text-sm font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All Features Included</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50/80 border border-orange-100 text-slate-800 text-xs sm:text-sm font-bold shadow-xs">
                <span className="text-orange-600 text-base">👥</span>
                <span>For Every Business</span>
              </div>
            </div>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-8">
              <button
                type="button"
                onClick={handleStartFree}
                className="h-13 px-8 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-base shadow-xl shadow-blue-700/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Free Now</span>
                <span className="text-lg">🚀</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="h-13 px-7 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-base active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Explore CredSmart</span>
                <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center">
                  <Play className="w-2.5 h-2.5 fill-slate-700 text-slate-700 ml-0.5" />
                </div>
              </button>
            </div>

            {/* Trust Checklist Row */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-medium text-slate-600">
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
        </section>

        {/* ── SECTION 2: "WHY BUSINESSES LOVE CREDSMART" (6-Card Grid Matching Reference) ── */}
        <section id="features" className="py-14 sm:py-20 bg-white border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Why Businesses Love <span className="text-[#FF6A00]">CredSmart</span>
              </h2>
            </div>

            {/* 6 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
              
              {/* 1. Complete & Free */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4">
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
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
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
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
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
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
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
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
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

        {/* ── SECTION 3: DUAL FEATURE SPOTLIGHT CARDS (Ecosystem & CredAlert Intelligence) ── */}
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

                  {/* Flow Diagram (Matching Reference) */}
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

        {/* ── SECTION 4: HIGH-CONVERSION BOTTOM BANNER (Matching Reference) ── */}
        <section className="py-10 sm:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-6 sm:p-10 shadow-2xl text-white flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
              
              {/* Subtle Backglow */}
              <div className="absolute right-0 bottom-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

              {/* Left Content */}
              <div className="flex items-center gap-5 text-left">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-slate-900 flex items-center justify-center text-2xl sm:text-3xl shadow-xl shrink-0">
                  🚀
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    Run Your Entire Business. <span className="text-amber-300">For Free.</span>
                  </h3>
                  <p className="text-sm sm:text-base text-blue-100 mt-1">
                    Stop juggling multiple tools. Start using CredSmart today.
                  </p>
                </div>
              </div>

              {/* Center Checkmarks */}
              <div className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-bold text-blue-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Complete Solution
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  All Features Free
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Trusted by Businesses
                </span>
              </div>

              {/* Right CTA Button */}
              <div className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleStartFree}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-700 font-extrabold text-base shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">🚀</span>
                  <span>Start Free Now</span>
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* ── PUBLIC FOOTER ── */}
        <PublicFooter />

        {/* ── MODALS FOR INTERACTIVE EXPLORATION ── */}
        
        {/* Video Tour Modal */}
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
              <p className="text-xs text-slate-400">GST Billing • Barcode POS • Inventory &amp; Ledgers</p>
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

        {/* Ecosystem Modal */}
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

        {/* Check Business Credibility Modal */}
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

      </div>
    </>
  );
}
