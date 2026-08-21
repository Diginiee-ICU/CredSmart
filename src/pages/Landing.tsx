import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Store,
  BarChart3,
  Users,
  Zap,
  Shield,
  Smartphone,
  Package,
  Truck,
  Globe,
  Receipt,
  Printer,
  Sparkles,
  ArrowUpRight,
  Cpu,
  Database,
  Lock,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

/* ─────────────────────────── JSON-LD DATA ─────────────────────────── */
const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CredSmart POS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "1240",
  },
  description:
    "CredSmart POS is India's #1 free GST billing and POS software for Indian businesses. Create GST invoices, manage inventory, track Udhar Khata and run your retail store 100% free.",
  featureList: [
    "GST Billing with CGST SGST IGST",
    "Thermal and A4 Invoice Printing",
    "Inventory Management with Batch Tracking",
    "Customer Udhar Khata / Credit Ledger",
    "B2B Vendor Discovery with 3M+ Companies",
    "GSTR Export for CA",
    "Supplier and Purchase Order Management",
    "Barcode Scanner Support",
  ],
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is CredSmart POS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CredSmart POS is a comprehensive, free GST billing and point-of-sale software designed specifically for Indian businesses. It allows you to create professional GST invoices, manage inventory, maintain customer Udhar Khata, track purchases, and run your entire retail or wholesale operation — all at zero cost.",
      },
    },
    {
      "@type": "Question",
      name: "Is CredSmart POS really free forever?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. CredSmart POS is 100% free with no credit card required, no trial period, and no hidden charges. You get full access to every feature from day one, forever.",
      },
    },
    {
      "@type": "Question",
      name: "Does CredSmart POS support GST billing with CGST and SGST?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. CredSmart POS fully supports GST invoicing including CGST, SGST, and IGST calculations. You can generate GST-compliant A4 and thermal invoices instantly.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use CredSmart POS on my mobile phone?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. CredSmart POS is a responsive web application that works seamlessly on any modern browser — whether on your smartphone, tablet, or desktop computer. No app download required.",
      },
    },
    {
      "@type": "Question",
      name: "Is my business data secure on CredSmart POS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Your data is protected with bank-grade encryption and stored securely on Supabase, a world-class cloud infrastructure provider. Your business data is private and never shared.",
      },
    },
    {
      "@type": "Question",
      name: "How is CredSmart POS different from Vyapar or myBillBook?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unlike Vyapar and myBillBook which charge thousands per year for full features, CredSmart POS is completely free — every feature, forever. We also offer unique B2B Vendor Discovery with 3M+ MCA-registered companies.",
      },
    },
  ],
};

const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CredSmart POS",
  url: "https://credsmart.in",
  logo: "https://credsmart.in/favicon.png",
  description: "India's free GST billing and POS software provider",
  sameAs: [],
};

/* ─────────────────────────── STATIC DATA ─────────────────────────── */
const features = [
  {
    icon: Zap,
    tag: "BILLING ENGINE",
    title: "GST Invoicing & Multi-Format POS",
    desc: "Generate GST-compliant A4 and thermal invoices in under 2 seconds. Seamless auto CGST, SGST, and IGST breakdowns with HSN auto-lookup.",
    accent: "ruby",
  },
  {
    icon: Package,
    tag: "SMART LEDGER",
    title: "Batch & Expiry Inventory Matrix",
    desc: "Real-time stock tracking with low-stock thresholds, batch number traceability, FIFO valuation, and barcode label generation.",
    accent: "gold",
  },
  {
    icon: Users,
    tag: "CREDIT LEDGER",
    title: "Digital Customer Udhar Khata",
    desc: "Maintain complete ledger books for retail & B2B buyers. Automatic WhatsApp payment reminders, credit limits, and settlements.",
    accent: "navy",
  },
  {
    icon: Truck,
    tag: "INWARD LOGISTICS",
    title: "Supplier & Purchase Orders",
    desc: "Manage vendor rate lists, generate POs, record inward tax invoices, track payables, and issue instant debit note returns.",
    accent: "ruby",
  },
  {
    icon: Globe,
    tag: "3M+ MCA DATABASE",
    title: "B2B Vendor & Supplier Discovery",
    desc: "Search, evaluate, and connect with 3,000,000+ verified MCA-registered Indian companies to source inventory at direct wholesale prices.",
    accent: "gold",
  },
  {
    icon: BarChart3,
    tag: "TAX & COMPLIANCE",
    title: "One-Click GSTR & CA Reports",
    desc: "Generate instant GSTR-1, GSTR-3B summaries, profit & loss statements, item velocity matrices, and audit logs ready for your CA.",
    accent: "navy",
  },
];

const businesses = [
  { name: "Kirana & Supermarkets", count: "18.4k+ Stores" },
  { name: "Pharma & Medical Stores", count: "9.2k+ Pharmacies" },
  { name: "Electronics & Hardware", count: "7.1k+ Retailers" },
  { name: "Apparel & Textiles", count: "11.5k+ Boutiques" },
  { name: "FMCG Distributors", count: "4.8k+ Warehouses" },
  { name: "Wholesale Traders", count: "6.3k+ Traders" },
  { name: "Restaurants & Cafes", count: "8.9k+ Outlets" },
  { name: "Automobile Spare Parts", count: "3.4k+ Workshops" },
];

const stats = [
  { num: "3.2M+", label: "Verified MCA Companies in DB", mono: true, highlight: "gold" },
  { num: "₹0.00", label: "Cost Forever · No Hidden Fees", mono: true, highlight: "ruby" },
  { num: "99.98%", label: "Cloud Uptime & Offline Engine", mono: true, highlight: "navy" },
  { num: "< 2.0s", label: "Average Checkout & Print Speed", mono: true, highlight: "gold" },
];

const trustChips = [
  "Zero Credit Card Required",
  "100% GST & E-Way Compliant",
  "Works Online & Offline",
  "256-Bit Encrypted Cloud Sync",
];

const faqs = [
  {
    q: "What is CredSmart POS and how does it work?",
    a: "CredSmart POS is an enterprise-grade, high-performance point-of-sale and GST invoicing infrastructure designed specifically for Indian retailers, wholesalers, and distributors. It provides instantaneous barcode scanning, automated CGST/SGST/IGST tax calculation, real-time batch stock tracking, customer Udhar Khata ledger management, and supplier discovery.",
  },
  {
    q: "Is CredSmart POS truly 100% free forever?",
    a: "Yes. CredSmart POS has zero software license fees, zero monthly subscriptions, zero transaction commissions on cash/standard billing, and zero trial limits. You get full, unrestricted access to the complete POS, inventory, customer ledger, and supplier suites from day one.",
  },
  {
    q: "How does CredSmart POS handle GST calculations and CA filings?",
    a: "CredSmart POS automatically calculates intra-state (CGST + SGST) and inter-state (IGST) tax rates based on your item catalog. At month-end or quarter-end, you can export comprehensive GSTR-1, GSTR-3B, and sales summary spreadsheets with a single click to hand over directly to your Chartered Accountant.",
  },
  {
    q: "Can I use CredSmart POS on mobile, tablet, and desktop without installing heavy software?",
    a: "Yes. CredSmart POS is engineered as an ultra-fast Progressive Web App (PWA). It runs directly in Chrome, Safari, Edge, or on Android/iOS devices with offline resilience, full thermal printer support (ESC/POS), and instant cloud backup.",
  },
  {
    q: "What is the B2B Vendor Discovery directory?",
    a: "CredSmart POS is the only retail platform in India integrated with a database of over 3 million MCA-registered companies. You can search manufacturers, wholesalers, and brand distributors across India, check their registration details, and source goods directly without middlemen.",
  },
  {
    q: "How secure is my store data and customer ledger?",
    a: "Your data is stored with bank-grade encryption across redundant, SOC2-compliant enterprise cloud infrastructure. Daily automated snapshots ensure you never lose a single invoice or ledger entry.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const [openFaq, setOpenFaq] = useState<boolean[]>(faqs.map((_, i) => i === 0));

  const toggleFaq = (i: number) =>
    setOpenFaq((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const targetAppRoute = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
  const goToAuth = () => navigate(user ? targetAppRoute : ROUTE_PATHS.auth);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />

      <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent selection:text-white">
        {/* ── TOP ANNOUNCEMENT STRIP ── */}
        <div className="bg-primary text-primary-foreground border-b border-primary/20 text-center text-xs sm:text-sm py-2 px-4 font-medium tracking-tight flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono text-[11px] uppercase tracking-wider font-semibold">
            <Flame className="w-3 h-3 text-accent animate-pulse" /> FREE INFRASTRUCTURE
          </span>
          <span>
            CredSmart POS is <strong className="text-white underline underline-offset-4 decoration-accent">100% Free Forever</strong> for Indian Businesses · Zero Subscriptions
          </span>
        </div>

        {/* ── FLOATING GLASS NAVIGATION ── */}
        <header className="sticky top-3 z-50 max-w-6xl mx-auto px-3 sm:px-6">
          <div className="glass-nav rounded-full px-4 sm:px-6 py-3 flex items-center justify-between transition-all duration-200">
            <Link to={user ? targetAppRoute : ROUTE_PATHS.landing} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform border border-gold/30 p-0.5 overflow-hidden">
                <img
                  src="/favicon.png"
                  alt="CredSmart POS logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg text-foreground tracking-tight flex items-center gap-1.5 leading-none">
                  CredSmart <span className="font-mono text-xs text-accent font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">POS</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono tracking-tight">by CredAlert</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <a href="#features" className="hover:text-foreground hover:text-accent transition-colors">Features</a>
              <a href="#preview" className="hover:text-foreground hover:text-accent transition-colors">POS Terminal</a>
              <a href="#businesses" className="hover:text-foreground hover:text-accent transition-colors">Businesses</a>
              <a href="#why-free" className="hover:text-foreground hover:text-accent transition-colors">Why Free?</a>
              <a href="#faq" className="hover:text-foreground hover:text-accent transition-colors">FAQ</a>
            </nav>

            <div className="flex items-center gap-2">
              {!user ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToAuth}
                    className="text-foreground hover:text-accent hidden sm:inline-flex rounded-full text-xs font-semibold uppercase tracking-wider px-4"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={goToAuth}
                    className="rounded-full px-5 bg-accent hover:bg-accent/90 text-white shadow-md shadow-accent/25 text-xs font-semibold uppercase tracking-wider"
                  >
                    Start Free <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={goToAuth}
                  className="rounded-full px-5 bg-accent hover:bg-accent/90 text-white shadow-md shadow-accent/25 text-xs font-semibold uppercase tracking-wider"
                >
                  POS Dashboard <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* ── ATMOSPHERIC HERO SECTION ── */}
        <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32 gradient-hero">
          {/* Ambient Glow Orbs */}
          <div aria-hidden className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gold/10 rounded-full blur-3xl opacity-60" />
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-20 w-[450px] h-[450px] bg-accent/10 rounded-full blur-3xl opacity-50" />
          <div aria-hidden className="pointer-events-none absolute top-40 -left-20 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl opacity-40" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            {/* Live Indicator Monospace Pill Badge */}
            <div className="inline-flex items-center gap-2.5 bg-card/80 border border-gold/30 text-foreground text-xs font-mono px-4 py-1.5 rounded-full mb-8 shadow-xs backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span>⚡ INDIA'S #1 FREE GST BILLING &amp; POS INFRASTRUCTURE</span>
            </div>

            {/* Editorial Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight leading-[1.08] mb-8">
              Free GST Billing &amp; POS
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-gold bg-clip-text text-transparent">
                Infrastructure for India.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
              High-speed retail invoicing, multi-batch inventory, automated <strong className="text-foreground font-semibold">CGST / SGST breakdown</strong>, customer <strong className="text-foreground font-semibold">Udhar Khata</strong>, and direct <strong className="text-foreground font-semibold">3M+ MCA vendor discovery</strong>. Zero cost. No trial limits. Bank-grade resilience.
            </p>

            {/* CTA Action Group */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center mb-12">
              <Button
                size="lg"
                onClick={goToAuth}
                className="w-full sm:w-auto rounded-full px-9 py-6 text-sm sm:text-base font-bold bg-accent hover:bg-accent/90 text-white shadow-xl shadow-accent/30 hover:shadow-accent/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {user ? "Launch POS Dashboard" : "Start Billing Free Now"} <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto rounded-full px-8 py-6 text-sm sm:text-base font-semibold border-border/80 bg-card/60 hover:bg-card text-foreground transition-all"
              >
                <a href="#preview" className="flex items-center gap-2">
                  <span>Explore Terminal Output</span>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </a>
              </Button>
            </div>

            {/* Trust Chips */}
            <div className="flex flex-wrap gap-2.5 justify-center items-center mb-16">
              {trustChips.map((chip) => (
                <div
                  key={chip}
                  className="flex items-center gap-2 text-xs font-medium text-foreground bg-card/90 border border-border/80 rounded-full px-3.5 py-1.5 shadow-2xs backdrop-blur-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>{chip}</span>
                </div>
              ))}
            </div>

            {/* Monospace Stat Bento Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-sm hover:border-gold/40 transition-all group"
                >
                  <p
                    className={cn(
                      "text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-none mb-2",
                      s.highlight === "gold" && "text-gold",
                      s.highlight === "ruby" && "text-accent",
                      s.highlight === "navy" && "text-primary dark:text-foreground"
                    )}
                  >
                    {s.num}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium leading-snug">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE TERMINAL / STRUCTURED PREVIEW CARD ── */}
        <section id="preview" className="py-20 bg-background relative border-t border-border/60 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                SYSTEM EXECUTION PREVIEW
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-3 mb-3">
                Engineered for Split-Second Checkout
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                High-throughput GST tax breakdown, dual print pipelines (A4 + 3-inch ESC/POS thermal), and live inventory decrement.
              </p>
            </div>

            {/* Obsidian Code Terminal Window */}
            <div className="rounded-3xl border border-gold/30 bg-[#12131A] text-slate-100 shadow-2xl overflow-hidden font-mono text-xs">
              {/* Window Titlebar */}
              <div className="px-5 py-3.5 bg-[#1F2440] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] text-slate-300 ml-2 font-medium">credsmart-engine // GST-INVOICE-GEN.json</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE · SYNC OK</span>
                </div>
              </div>

              {/* Terminal Body with Split Details */}
              <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-300">
                {/* JSON Code Left */}
                <div className="lg:col-span-7 space-y-2 overflow-x-auto">
                  <div className="text-slate-500 pb-1">// Automated GST 18% Tax Computation Pipeline</div>
                  <p><span className="text-indigo-400">"invoice_number"</span>: <span className="text-amber-300">"INV-2025-08492"</span>,</p>
                  <p><span className="text-indigo-400">"customer"</span>: &#123; <span className="text-indigo-300">"name"</span>: <span className="text-emerald-300">"Sharma Traders"</span>, <span className="text-indigo-300">"gstin"</span>: <span className="text-amber-300">"07AAAAA0000A1Z5"</span> &#125;,</p>
                  <p><span className="text-indigo-400">"line_items"</span>: [</p>
                  <p className="pl-4">&#123; <span className="text-indigo-300">"sku"</span>: <span className="text-amber-300">"8901030382901"</span>, <span className="text-indigo-300">"item"</span>: <span className="text-emerald-300">"Organic Tea 500g"</span>, <span className="text-indigo-300">"qty"</span>: <span className="text-rose-400">4</span>, <span className="text-indigo-300">"rate"</span>: <span className="text-rose-400">₹525.00</span> &#125;</p>
                  <p>],</p>
                  <p><span className="text-indigo-400">"taxable_amount"</span>: <span className="text-rose-400">₹2,100.00</span>,</p>
                  <p><span className="text-indigo-400">"tax_breakdown"</span>: &#123;</p>
                  <p className="pl-4"><span className="text-indigo-300">"cgst_9pct"</span>: <span className="text-rose-400">₹189.00</span>,</p>
                  <p className="pl-4"><span className="text-indigo-300">"sgst_9pct"</span>: <span className="text-rose-400">₹189.00</span>,</p>
                  <p className="pl-4"><span className="text-indigo-300">"total_gst"</span>: <span className="text-rose-400">₹378.00</span></p>
                  <p>&#125;,</p>
                  <p><span className="text-indigo-400">"grand_total"</span>: <span className="text-emerald-400 font-bold">₹2,478.00</span>,</p>
                  <p><span className="text-indigo-400">"thermal_esc_pos"</span>: <span className="text-slate-400 font-mono">"RAW_BYTES_READY (80mm/58mm)"</span></p>
                </div>

                {/* Simulated Invoice Receipt Right */}
                <div className="lg:col-span-5 bg-[#1F2440] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-gold" />
                        <span className="font-bold text-white uppercase tracking-wider text-[11px]">Thermal Invoice</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">PAID (UPI)</span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Invoice:</span>
                        <span className="text-white font-mono">INV-2025-08492</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Customer:</span>
                        <span className="text-white">Sharma Traders</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Taxable Value:</span>
                        <span className="font-mono">₹2,100.00</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>CGST (9%):</span>
                        <span className="font-mono">+ ₹189.00</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>SGST (9%):</span>
                        <span className="font-mono">+ ₹189.00</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-emerald-400">
                        <span>Total Paid:</span>
                        <span className="font-mono">₹2,478.00</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-gold" /> ESC/POS Ready
                    </span>
                    <span className="text-slate-500">CredSmart Core v2.4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO FEATURE GRID SECTION ── */}
        <section id="features" className="py-24 bg-background relative border-t border-border/60 scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                COMPLETE RETAIL SUITE
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mt-3 mb-4">
                Everything Your Store Needs, <span className="text-accent">Zero Cost</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                High-performance modules crafted for grocery stores, pharmacies, textile retailers, and wholesale distributors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="card-interactive bg-card rounded-3xl p-6 sm:p-7 border border-border/80 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                            f.accent === "ruby" && "bg-accent/10 text-accent border border-accent/20",
                            f.accent === "gold" && "bg-gold/10 text-gold border border-gold/30",
                            f.accent === "navy" && "bg-primary/10 text-primary dark:text-foreground border border-primary/20"
                          )}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase px-2 py-0.5 rounded bg-muted/60">
                          {f.tag}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-foreground mb-2.5 tracking-tight group-hover:text-accent transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.desc}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-border/60 flex items-center text-xs font-semibold text-accent gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Explore feature</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-14">
              <Button
                size="lg"
                onClick={goToAuth}
                className="rounded-full px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
              >
                Access All Modules for Free <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── BUILT FOR INDIAN BUSINESSES ── */}
        <section id="businesses" className="py-20 bg-muted/30 border-t border-border/60 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <span className="font-mono text-xs uppercase tracking-wider text-gold font-semibold px-3 py-1 rounded-full bg-gold/10 border border-gold/30">
              COMMERCE ENGINE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-3 mb-4">
              Tailored for Every Segment of Indian Trade
            </h2>
            <p className="text-base text-muted-foreground mb-12 max-w-xl mx-auto">
              Whether you process 2,000 barcode scans a day or handle B2B wholesale credit ledgers, CredSmart adapts dynamically.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {businesses.map((biz) => (
                <div
                  key={biz.name}
                  className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 text-left shadow-2xs hover:border-gold/40 hover:-translate-y-0.5 transition-all"
                >
                  <p className="font-bold text-sm text-foreground mb-1">{biz.name}</p>
                  <p className="font-mono text-xs text-accent font-semibold">{biz.count}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY COMPLETELY FREE SECTION (LUXURY QUOTE) ── */}
        <section id="why-free" className="py-24 bg-background relative border-t border-border/60 scroll-mt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                OUR MISSION &amp; PHILOSOPHY
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-3 mb-4">
                Why is CredSmart POS <span className="text-accent">Completely Free?</span>
              </h2>
            </div>

            {/* Porcelain Mission Card */}
            <div className="bg-card rounded-3xl border-2 border-gold/30 p-8 sm:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-gold" />
              
              <div className="space-y-6 text-foreground text-sm sm:text-base leading-relaxed">
                <p>
                  India is home to over <strong className="font-bold text-foreground">63 million MSMEs and shopkeepers</strong> who form the backbone of the nation's economy. Yet legacy software vendors force small businesses into paying ₹2,000 to ₹6,000 every single year just to print basic GST receipts and maintain stock.
                </p>
                <p>
                  We believe that <strong className="text-accent font-semibold">essential digital billing, GST invoicing, and inventory infrastructure should be free, open, and universally accessible</strong>. CredSmart is built to eliminate software tax on Indian trade.
                </p>
              </div>

              {/* Highlighted Quote Box */}
              <blockquote className="mt-8 p-6 rounded-2xl bg-muted/50 border-l-4 border-accent text-foreground text-base sm:text-lg font-medium italic">
                "No Indian shopkeeper should ever have to pause billing or risk compliance penalties because they cannot afford an annual software license renew fee. CredSmart is free forever."
                <footer className="mt-3 not-italic font-mono text-xs uppercase tracking-wider text-accent font-bold">
                  — CredSmart POS Engineering &amp; Design Group
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ── FAQ ACCORDION SECTION ── */}
        <section id="faq" className="py-24 bg-muted/20 border-t border-border/60 scroll-mt-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                HELP &amp; CLARIFICATIONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-3 mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Clear answers regarding licensing, hardware compatibility, GST compliance, and data security.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((item, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl border border-border/80 overflow-hidden shadow-2xs transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-muted/30 transition-colors"
                    aria-expanded={openFaq[i]}
                  >
                    <span className="font-bold text-foreground text-sm sm:text-base pr-4">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200",
                        openFaq[i] && "rotate-180 text-accent"
                      )}
                    />
                  </button>
                  {openFaq[i] && (
                    <div className="px-6 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA BANNER ── */}
        <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden border-t border-primary/20">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gold/20 blur-3xl" />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 inline-block mb-6">
              INSTANT SETUP IN UNDER 30 SECONDS
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
              Empower Your Store with CredSmart Today
            </h2>
            <p className="text-slate-300 text-base sm:text-lg mb-10 max-w-xl mx-auto">
              Join thousands of Indian store owners who have streamlined their billing, eliminated software subscription costs, and automated GST compliance.
            </p>
            <Button
              size="lg"
              onClick={goToAuth}
              className="rounded-full px-10 py-7 text-base font-bold bg-accent hover:bg-accent/90 text-white shadow-2xl shadow-accent/40 transition-all hover:scale-105 active:scale-95"
            >
              Get Started Completely Free <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="mt-4 text-xs text-slate-400 font-mono">
              No credit card required · Instant web &amp; mobile access · Export for CA anytime
            </p>
          </div>
        </section>

        {/* ── DEEP MIDNIGHT SLATE FOOTER ── */}
        <footer className="bg-[#12131A] text-slate-400 pt-16 pb-12 border-t border-white/5 font-sans">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center border border-gold/30 p-0.5 overflow-hidden">
                    <img
                      src="/favicon.png"
                      alt="CredSmart POS logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="font-bold text-white text-lg tracking-tight">CredSmart POS</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-400 max-w-sm mb-4">
                  India's high-performance, 100% free GST billing &amp; point-of-sale infrastructure for retail stores, supermarkets, pharmacies, and wholesale distributors.
                </p>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>ALL SERVERS OPERATIONAL · SUPABASE ENCRYPTED</span>
                </div>
              </div>

              <div>
                <h4 className="text-white font-mono font-semibold mb-4 text-xs uppercase tracking-wider">Navigation</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><a href="#features" className="hover:text-white transition-colors">Features Matrix</a></li>
                  <li><a href="#preview" className="hover:text-white transition-colors">POS Terminal</a></li>
                  <li><a href="#businesses" className="hover:text-white transition-colors">Supported Businesses</a></li>
                  <li><a href="#faq" className="hover:text-white transition-colors">Help &amp; FAQ</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-mono font-semibold mb-4 text-xs uppercase tracking-wider">Legal &amp; Policy</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><Link to={ROUTE_PATHS.privacyPolicy} className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link to={ROUTE_PATHS.termsOfService} className="hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><button onClick={goToAuth} className="hover:text-white transition-colors text-left">Store Login</button></li>
                  <li><button onClick={goToAuth} className="hover:text-white transition-colors text-left">Create Free Account</button></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
              <p>© {new Date().getFullYear()} CredSmart POS. Free GST Billing Software for Indian Businesses. All rights reserved.</p>
              <p className="font-mono text-[11px] text-slate-400">Design language inspired by credalert.business</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
