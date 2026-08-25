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
  ShieldCheck,
  Scale,
  FileCheck,
  Smartphone,
  Package,
  Truck,
  Globe,
  Receipt,
  Printer,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Database,
  Lock,
  Flame,
  Search,
  Activity,
  CodeXml,
  Sun,
  Moon,
  Menu,
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
        text: "Yes. Your data is protected with bank-grade encryption and stored securely on world-class cloud infrastructure. Your business data is private and never shared.",
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
const stats = [
  { num: "3.2M+", label: "Listed businesses" },
  { num: "100%", label: "KYC verified" },
  { num: "₹0.00", label: "Cost forever" },
];

const governanceRows = [
  { label: "Grievance acknowledgement", value: "24 hours" },
  { label: "Grievance resolution", value: "15 days" },
  { label: "Takedown first review", value: "36 hours" },
  { label: "DPDP request response", value: "30 days" },
  { label: "Invoice generation speed", value: "< 2.0 seconds" },
];

const principles = [
  {
    icon: FileCheck,
    title: "Evidence, not opinion",
    desc: "Every report and billing record requires authenticated documents — invoices, challans, ledgers, and tax filings with SHA-256 integrity.",
  },
  {
    icon: Scale,
    title: "Right of Reply, always",
    desc: "Reported businesses are notified before publication and get 30 days to publish an unedited reply that sits alongside the report permanently.",
  },
  {
    icon: ShieldCheck,
    title: "Intermediary by design",
    desc: "CredSmart never authors, edits or endorses a report. Safe-harbour posture under Section 2(1)(w) IT Act and statutory workflows are built in.",
  },
];

const trustMetrics = [
  {
    icon: Activity,
    title: "Responsiveness",
    desc: "Share of published reports naming the business that received an active Right of Reply.",
  },
  {
    icon: Scale,
    title: "Resolution",
    desc: "Share of commercial disputes resolved and reports withdrawn after bilateral engagement.",
  },
  {
    icon: FileCheck,
    title: "Profile completeness",
    desc: "GSTIN, PAN, CIN registration identifiers, authorised KYC documents, and direct contact channels on file.",
  },
];

const steps = [
  {
    num: "01",
    title: "Verify your business",
    desc: "GSTIN, PAN, CIN and authorised-signatory KYC before you can publish or transact.",
  },
  {
    num: "02",
    title: "Submit with documents",
    desc: "Structured intake with minimum evidence thresholds, GST line items, and a signed reporter declaration.",
  },
  {
    num: "03",
    title: "Notice & Right of Reply",
    desc: "The counterparty is served notice and can respond before and after public listing.",
  },
  {
    num: "04",
    title: "Moderation & billing sync",
    desc: "Automated verification for compliance sufficiency — fast, neutral, and permanently audited.",
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

const complianceControls = [
  {
    title: "Row-level access control",
    desc: "Every database table is governed by role-scoped policies. Invoices and evidence never leave their private vault without an audited URL.",
  },
  {
    title: "Immutable audit trail",
    desc: "Views, downloads, status transitions and staff actions are appended to an append-only log with actor, timestamp, and reason.",
  },
  {
    title: "DPDP-aligned processing",
    desc: "Purpose-bound data collection, consent records, and data-principal requests answered within 30 days under Indian data protection law.",
  },
  {
    title: "Legal holds & LEA workflow",
    desc: "Records under commercial dispute or legal hold cannot be mutated. Law-enforcement requests follow a documented statutory channel.",
  },
];

const faqs = [
  {
    q: "Is CredSmart / CredAlert a credit bureau?",
    a: "No. CredSmart / CredAlert is not a credit information company and issues no credit score or creditworthiness opinion. It is a neutral technology intermediary that hosts documented commercial experiences and GST billing infrastructure for verified Indian businesses.",
  },
  {
    q: "Is CredSmart POS really free forever?",
    a: "Yes. CredSmart POS has zero software license fees, zero monthly subscriptions, zero transaction commissions on standard cash/UPI billing, and zero trial limits. You get full, unrestricted access to the complete POS, inventory, customer ledger, and supplier suites from day one.",
  },
  {
    q: "What is the Right of Reply?",
    a: "Every reported business is served notice and has 30 days to publish an unedited reply. The reply is displayed permanently alongside the report, ensuring complete transparency and neutral balance.",
  },
  {
    q: "Does CredSmart POS support GST billing with CGST and SGST?",
    a: "Absolutely. CredSmart POS fully supports GST invoicing including CGST, SGST, and IGST calculations. You can generate GST-compliant A4 and thermal invoices instantly in under 2 seconds.",
  },
  {
    q: "How is evidence and invoice data protected?",
    a: "Each uploaded invoice or ledger document is SHA-256 hashed at intake and stored in a private, access-controlled vault with an immutable audit trail covering every view, print, and status transition.",
  },
  {
    q: "Can I use CredSmart POS on my mobile phone or tablet?",
    a: "Yes. CredSmart POS is engineered as a lightweight Progressive Web App (PWA). It runs directly in Chrome, Safari, Edge, or on Android/iOS devices with offline resilience, full thermal printer support (ESC/POS), and instant cloud backup.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const [openFaq, setOpenFaq] = useState<boolean[]>(faqs.map((_, i) => i === 0));
  const [searchVal, setSearchVal] = useState("");

  const toggleFaq = (i: number) =>
    setOpenFaq((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const targetAppRoute = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
  const goToAuth = (mode?: string) => {
    if (user) {
      navigate(targetAppRoute);
    } else {
      navigate(mode ? `${ROUTE_PATHS.auth}?mode=${mode}` : ROUTE_PATHS.auth);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`${ROUTE_PATHS.discovery}?q=${encodeURIComponent(searchVal.trim())}`);
    } else {
      navigate(ROUTE_PATHS.discovery);
    }
  };

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

      <div className="flex min-h-screen flex-col font-sans selection:bg-accent selection:text-white">
        {/* ── FLOATING GLASS NAVIGATION (CredAlert Style) ── */}
        <header className="sticky top-0 z-50 px-2 pt-2 sm:px-4 sm:pt-3">
          <div className="glass-nav mx-auto flex h-14 max-w-7xl items-center gap-2 rounded-2xl px-3 sm:h-16 sm:gap-4 sm:px-6">
            <Link
              to={user ? targetAppRoute : ROUTE_PATHS.landing}
              className="focus-ring min-w-0 shrink rounded-md active"
            >
              <span className="inline-flex items-center gap-2.5">
                <img
                  src="/favicon.png"
                  alt="CredSmart"
                  width="32"
                  height="32"
                  className="size-8 shrink-0 object-contain rounded-lg"
                />
                <span className="text-[17px] font-semibold tracking-tight">
                  Cred<span className="text-accent font-bold">Smart</span>
                </span>
              </span>
            </Link>

            <nav className="ml-4 hidden items-center gap-1 lg:flex">
              <a
                href="#features"
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#preview"
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Terminal
              </a>
              <a
                href="#principles"
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Principles
              </a>
              <Link
                to={ROUTE_PATHS.discovery}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Directory
              </Link>
              <a
                href="#compliance"
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Compliance
              </a>
              <a
                href="#faq"
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                FAQ
              </a>
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                aria-label="Search businesses"
                to={ROUTE_PATHS.discovery}
                className="ripple-surface items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all duration-300 focus-visible:outline-none hover:bg-accent/10 hover:text-accent h-9 w-9 hidden rounded-full sm:inline-flex"
              >
                <Search className="size-4" />
              </Link>

              {!user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToAuth("login")}
                    className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-all duration-300 hover:bg-accent/10 hover:text-accent h-8 rounded-full px-3.5 text-xs text-foreground"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => goToAuth("signup")}
                    className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-all duration-300 text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift h-8 px-4 text-xs rounded-full"
                  >
                    Register store
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate(targetAppRoute)}
                  className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-all duration-300 text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift h-8 px-4 text-xs rounded-full"
                >
                  Dashboard <ArrowRight className="size-3.5 ml-0.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── HERO SECTION WITH AURORA AND LIQUID GLASS CARDS ── */}
        <main className="flex-1">
          <div>
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="aurora" aria-hidden="true" />
              </div>
              <div className="grid-fade absolute inset-0 pointer-events-none" aria-hidden="true" />

              <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 relative pt-12 sm:pt-20">
                <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                  {/* Left Column */}
                  <div>
                    <div>
                      <span className="glass-input inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-2xs">
                        Free Infrastructure · Evidence-First · DPDP Aligned
                      </span>
                    </div>

                    <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.6rem] text-foreground">
                      Know who you are
                      <br />
                      <span className="text-gradient-ruby">doing business with.</span>
                    </h1>

                    <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                      A neutral commercial infrastructure that lets verified Indian businesses publish documented commercial experiences, generate GST-compliant invoices in under 2 seconds, and access 3M+ MCA-registered counterparties.
                    </p>

                    {/* Pill Search Input */}
                    <form
                      onSubmit={handleSearchSubmit}
                      role="search"
                      className="glass-input mt-8 flex items-center gap-2 rounded-full p-1.5 pl-4 sm:max-w-xl shadow-xs"
                    >
                      <Search className="size-4 shrink-0 text-muted-foreground" />
                      <label htmlFor="global-search" className="sr-only">
                        Search by GSTIN, CIN, PAN or company name
                      </label>
                      <input
                        id="global-search"
                        placeholder="Search GSTIN, CIN, PAN or company name"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground text-foreground"
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                      />
                      <button
                        className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-all duration-300 text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift h-8 text-xs shrink-0 rounded-full px-5"
                        type="submit"
                      >
                        Search
                      </button>
                    </form>

                    {/* Action Buttons */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => goToAuth("signup")}
                        className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all duration-300 text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift h-10 px-7 rounded-full"
                      >
                        Register your business <ArrowRight className="ml-1.5 size-4" />
                      </button>
                      <Link
                        to={ROUTE_PATHS.discovery}
                        className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all duration-300 glass-input text-foreground hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-accent h-10 px-7 rounded-full"
                      >
                        Browse the directory
                      </Link>
                    </div>

                    {/* 3 Stat Counters in Soft Liquid Glass */}
                    <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
                      {stats.map((s) => (
                        <div key={s.label}>
                          <div className="liquid-glass-soft h-full p-4">
                            <p className="text-2xl font-semibold tracking-tight font-mono text-foreground">
                              <span className="tabular-nums">{s.num}</span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Floating Governance Snapshot Card */}
                  <div>
                    <div className="liquid-glass glass-shimmer hover-lift float-slow p-6 sm:p-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground font-mono">
                        Governance &amp; SLA snapshot
                      </p>
                      <div className="mt-5 space-y-4">
                        {governanceRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0"
                          >
                            <span className="text-sm text-muted-foreground">{row.label}</span>
                            <span className="text-sm font-semibold tabular-nums font-mono text-foreground">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="rounded-2xl border border-border bg-secondary/60 px-4 py-3.5 text-xs leading-relaxed text-muted-foreground mt-6">
                        CredSmart is an intermediary under Section 2(1)(w) of the Information Technology Act, 2000. It does not determine truth, does not perform debt recovery, is not a credit bureau, and never becomes the publisher of any commercial report.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── THREE PRINCIPLES SECTION (CredAlert Architecture) ── */}
            <section id="principles" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 pt-4">
              <div className="max-w-2xl">
                <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Architecture
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
                  Built on three non-negotiable principles
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  CredSmart is engineered as commercial compliance infrastructure first and billing software second. The legal posture is enforced in the schema, not in a policy page.
                </p>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {principles.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.title} className="h-full">
                      <div className="liquid-glass glass-shimmer hover-lift h-full p-6 sm:p-7">
                        <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                          <Icon className="size-5" />
                        </span>
                        <h3 className="mt-5 text-base font-semibold text-foreground">{p.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── LIVE INTERACTIVE PREVIEW TERMINAL ── */}
            <section id="preview" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 pt-4 scroll-mt-16">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div className="max-w-2xl">
                  <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    High-Speed POS Engine
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
                    Engineered for Split-Second Retail Checkout
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                    Automated intra-state (CGST + SGST) and inter-state (IGST) tax computation with dual thermal ESC/POS and A4 PDF printing.
                  </p>
                </div>
                <Link
                  to={ROUTE_PATHS.discovery}
                  className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all duration-300 glass-input text-foreground hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-accent h-9 px-4 py-2 rounded-full"
                >
                  Browse directory <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </div>

              {/* Obsidian Code Terminal Window */}
              <div className="rounded-3xl border border-gold/30 bg-[#0E121E] text-slate-100 shadow-2xl overflow-hidden font-mono text-xs">
                <div className="px-5 py-3.5 bg-[#141A29] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="text-[11px] text-slate-300 ml-2 font-medium">credsmart-engine // GST-INVOICE-PIPELINE.json</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE · SYNC LIVE</span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-300">
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

                  <div className="lg:col-span-5 bg-[#141A29] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
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
                      <span className="text-slate-500 font-mono">CredSmart v2.4</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── TRUST METRICS SECTION ── */}
            <div className="border-y border-border/70 bg-secondary/30">
              <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
                <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="max-w-2xl">
                    <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Trust metrics
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
                      Descriptive, mathematical, never predictive
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      Every metric on a counterparty profile is computed from activity recorded on this platform — how often the counterparty replies, and how often commercial accounts are settled.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {trustMetrics.map((m) => {
                      const Icon = m.icon;
                      return (
                        <div key={m.title} className="h-full">
                          <div className="liquid-glass glass-shimmer hover-lift h-full p-5">
                            <Icon className="size-5 text-accent" />
                            <p className="mt-4 text-sm font-semibold text-foreground">{m.title}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground mt-8 max-w-3xl">
                  Trust metrics are purely algorithmic descriptions of commercial activity recorded on this platform. They are not credit scores, not predictions, not creditworthiness opinions, and must not be used as the sole basis of any commercial decision.
                </p>
              </section>
            </div>

            {/* ── HOW CREDSMART WORKS (01, 02, 03, 04) ── */}
            <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
              <div className="max-w-2xl">
                <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  How CredSmart works
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
                  From onboarding to instant compliance
                </h2>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {steps.map((st) => (
                  <div key={st.num} className="h-full">
                    <div className="liquid-glass glass-shimmer hover-lift h-full p-6">
                      <span className="text-xs font-semibold tabular-nums text-accent font-mono">
                        {st.num}
                      </span>
                      <h3 className="mt-3 text-sm font-semibold text-foreground">{st.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <button
                  onClick={() => goToAuth("signup")}
                  className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all duration-300 glass-input text-foreground hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-accent h-9 px-5 py-2 rounded-full"
                >
                  Start Billing Free Now <ArrowRight className="ml-1.5 size-4" />
                </button>
              </div>
            </section>

            {/* ── ENTERPRISE & DEVELOPER REST API CARDS ── */}
            <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 pt-0">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <div className="liquid-glass glass-shimmer hover-lift h-full p-8">
                    <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Enterprise
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                      Procurement-grade vendor monitoring
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Build watchlists across your vendor portfolio, save searches, and receive alerts the moment an invoice, return, or report is recorded against a counterparty you track.
                    </p>
                    <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                      <li className="flex gap-3 items-center">
                        <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                        Portfolio watchlists and 3M+ MCA company lookups
                      </li>
                      <li className="flex gap-3 items-center">
                        <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                        Multi-warehouse Godown inventory &amp; batch matrix
                      </li>
                      <li className="flex gap-3 items-center">
                        <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                        Automated WhatsApp payment reminders for Udhar Khata
                      </li>
                      <li className="flex gap-3 items-center">
                        <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                        Role-scoped access for store owners, cashiers, and CAs
                      </li>
                    </ul>
                    <button
                      onClick={() => goToAuth("signup")}
                      className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all duration-300 text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift h-9 px-5 py-2 mt-7 rounded-full"
                    >
                      Explore enterprise <ArrowRight className="ml-1.5 size-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="liquid-glass glass-shimmer hover-lift h-full p-8">
                    <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      API &amp; developers
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                      Build CredSmart into your workflow
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      A documented REST API with scoped keys and webhooks so vendor verification, inventory updates, and invoice syncing run directly inside your ERP or procurement pipeline.
                    </p>

                    <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70 bg-[#0E121E] p-4 text-slate-300">
                      <pre className="font-mono text-xs leading-relaxed">
GET /v1/businesses?gstin=29AABCU9603R1ZM
Authorization: Bearer ck_live_••••••••••••

200 OK
&#123; "status": "active_gst",
  "response_rate": 96,
  "invoices_generated": 1420,
  "open_disputes": 0 &#125;
                      </pre>
                    </div>

                    <Link
                      to={ROUTE_PATHS.discovery}
                      className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all duration-300 glass-input text-foreground hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-accent h-9 px-5 py-2 mt-7 rounded-full"
                    >
                      <CodeXml className="mr-1.5 size-4" /> Search 3M+ Companies
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* ── SECURITY & COMPLIANCE ── */}
            <div id="compliance" className="border-y border-border/70 bg-secondary/30 scroll-mt-16">
              <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
                <div className="max-w-2xl">
                  <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Security &amp; compliance
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
                    Compliance controls that are enforced, not promised
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                    Safe-harbour posture under the IT Act and IT Rules, 2021, with DPDP-aligned processing and a complete evidentiary record for every transaction.
                  </p>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {complianceControls.map((c) => (
                    <div key={c.title} className="h-full">
                      <div className="liquid-glass glass-shimmer hover-lift flex h-full items-start gap-4 p-6">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                          <Lock className="size-4 text-accent" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-foreground">{c.title}</span>
                          <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                            {c.desc}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── TAILORED FOR INDIAN BUSINESSES ── */}
            <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
              <div className="max-w-2xl">
                <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Trade Segments
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
                  Tailored for Every Segment of Indian Trade
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Whether you process 2,000 barcode scans a day or handle B2B wholesale credit ledgers, CredSmart adapts dynamically.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {businesses.map((biz) => (
                  <div
                    key={biz.name}
                    className="liquid-glass-soft p-4 sm:p-5 text-left hover-lift"
                  >
                    <p className="font-semibold text-sm text-foreground mb-1">{biz.name}</p>
                    <p className="font-mono text-xs text-accent font-medium">{biz.count}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── FAQ ACCORDION SECTION ── */}
            <section id="faq" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20 scroll-mt-16">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Help &amp; Clarifications
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
                  Frequently Asked Questions
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Clear answers regarding licensing, hardware compatibility, GST compliance, and data security.
                </p>
              </div>

              <div className="space-y-3">
                {faqs.map((item, i) => (
                  <div
                    key={i}
                    className="liquid-glass-soft overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => toggleFaq(i)}
                      className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-secondary/40 transition-colors"
                      aria-expanded={openFaq[i]}
                    >
                      <span className="font-semibold text-foreground text-sm sm:text-base pr-4">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
                          openFaq[i] && "rotate-180 text-accent"
                        )}
                      />
                    </button>
                    {openFaq[i] && (
                      <div className="px-6 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── FINAL CTA BANNER ── */}
            <div className="border-t border-border/70 bg-secondary/30">
              <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 text-center">
                <div className="max-w-3xl mx-auto">
                  <span className="glass-input inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-6">
                    ⚡ Instant Zero-Cost Onboarding
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-5">
                    Empower Your Commercial Trade with CredSmart
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                    Join thousands of Indian enterprises and store owners who have streamlined their billing, eliminated software license fees, and secured their commercial ledger.
                  </p>
                  <button
                    onClick={() => goToAuth("signup")}
                    className="ripple-surface inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-semibold cursor-pointer transition-all duration-300 text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift h-12 px-9 rounded-full"
                  >
                    Get Started Completely Free <ArrowRight className="ml-2 size-5" />
                  </button>
                  <p className="mt-4 text-xs text-muted-foreground font-mono">
                    Zero credit card required • Instant web &amp; mobile access • Section 2(1)(w) IT Act Ready
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* ── INSTITUTIONAL FOOTER (CredAlert Style) ── */}
        <footer className="bg-[#0B1120] text-slate-400 pt-16 pb-12 border-t border-slate-800/80 font-sans">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <img
                    src="/favicon.png"
                    alt="CredSmart"
                    width="32"
                    height="32"
                    className="size-8 object-contain rounded-lg"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-lg tracking-tight">
                      Cred<span className="text-accent font-bold">Smart</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Commercial Infrastructure by CredAlert</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-400 max-w-sm mb-4">
                  India's high-performance, 100% free GST billing, customer credit ledger, and commercial reputation infrastructure for retail stores, supermarkets, pharmacies, and wholesale distributors.
                </p>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ALL SYSTEMS OPERATIONAL • 256-BIT ENCRYPTION • SECTION 2(1)(w) IT ACT</span>
                </div>
              </div>

              <div>
                <h4 className="text-white font-mono font-semibold mb-4 text-xs uppercase tracking-wider">Navigation</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><a href="#features" className="hover:text-white transition-colors">Features Matrix</a></li>
                  <li><a href="#preview" className="hover:text-white transition-colors">POS Terminal</a></li>
                  <li><a href="#principles" className="hover:text-white transition-colors">Architecture Principles</a></li>
                  <li><Link to={ROUTE_PATHS.discovery} className="hover:text-white transition-colors">MCA Directory</Link></li>
                  <li><a href="#faq" className="hover:text-white transition-colors">Help &amp; FAQ</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-mono font-semibold mb-4 text-xs uppercase tracking-wider">Legal &amp; Compliance</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><Link to={ROUTE_PATHS.privacyPolicy} className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link to={ROUTE_PATHS.termsOfService} className="hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><button onClick={() => goToAuth("login")} className="hover:text-white transition-colors text-left">Store Login</button></li>
                  <li><button onClick={() => goToAuth("signup")} className="hover:text-white transition-colors text-left">Create Free Account</button></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
              <p>© {new Date().getFullYear()} CredSmart POS. Free GST Billing Software for Indian Businesses. All rights reserved.</p>
              <p className="font-mono text-[11px] text-slate-400">CredAlert — India's commercial reputation infrastructure • Section 2(1)(w) IT Act • 256-bit Encrypted</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
