import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Receipt,
  ShoppingCart,
  Package,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaqIndices, setOpenFaqIndices] = useState<Set<number>>(new Set([0, 1]));

  const faqData = [
    {
      category: "general",
      q: "What is CredSmart POS?",
      a: "CredSmart POS is India's #1 free GST billing, point-of-sale, and inventory management software. It allows retail shop owners, wholesalers, and distributors to generate GST invoices, manage stock, track customer Udhar Khata, design barcode labels, and file GSTR-1 returns with zero software cost.",
    },
    {
      category: "general",
      q: "Is CredSmart POS really 100% free forever?",
      a: "Yes. CredSmart POS has zero software fees, zero monthly or annual subscriptions, zero transaction commissions on standard cash/UPI sales, and no hidden trial limits. You get full access to all 12 modules from day one.",
    },
    {
      category: "general",
      q: "How does CredSmart compare to Vyapar or myBillBook?",
      a: "Unlike Vyapar and myBillBook which charge ₹3,000 to ₹7,000 annually per computer, CredSmart POS is completely free. In addition, CredSmart offers built-in barcode label design, 1-tap multi-store switching, real-time cloud sync across devices, and access to a directory of 3.2M+ verified Indian businesses.",
    },
    {
      category: "pos",
      q: "Which thermal printers and barcode scanners are supported?",
      a: "CredSmart POS is compatible with all standard ESC/POS USB, Bluetooth, and Wi-Fi thermal printers (both 2-inch 58mm and 3-inch 80mm rolls) such as TVS, Epson, Everycom, NGX, and Pegasus. It also works with all standard USB and wireless handheld 1D/2D barcode scanners.",
    },
    {
      category: "pos",
      q: "Can I bill multiple customers at once during rush hours?",
      a: "Yes. The POS Billing Terminal supports up to 5 concurrent 'Held Bills'. If a customer forgets an item or delays payment, you can park their cart with Ctrl+B or by clicking Hold, bill the next customer, and resume the held bill instantly with Ctrl+1 through Ctrl+5.",
    },
    {
      category: "gst",
      q: "Does CredSmart support all GST tax slabs (0%, 5%, 12%, 18%, 28%)?",
      a: "Yes. CredSmart supports all official GST tax rates, composite schemes, nil-rated items, and automated intra-state (CGST + SGST) vs inter-state (IGST) tax calculation based on customer and store state codes.",
    },
    {
      category: "gst",
      q: "How do I export my monthly GSTR-1 for tax filing?",
      a: "Navigate to the Reports hub and click 'GSTR-1 JSON (GST Portal)'. CredSmart automatically generates the official GSTN Schema 2.0 JSON file with B2B, B2CL, B2CS, and HSN summary tables, ready for immediate upload on the official GST portal.",
    },
    {
      category: "inventory",
      q: "Can I design and print custom barcode stickers for my products?",
      a: "Yes. Use the Barcode Label Studio to choose from standard thermal roll sizes (50x38mm, 38x25mm) or full A4 sticker sheets (24, 40, or 65 stickers per page). Customize your shop name, product title, barcode, selling price, and MRP before printing.",
    },
    {
      category: "inventory",
      q: "Does CredSmart support batch numbers and expiry tracking?",
      a: "Yes. You can assign batch numbers, manufacturing dates, and expiry dates to your items—ideal for pharmacies, medical stores, packaged food, and FMCG distributors.",
    },
    {
      category: "khata",
      q: "How does the Customer Udhar Khata ledger work?",
      a: "Every credit sale automatically reflects on the customer's Khata statement with a running balance. You can record partial cash/UPI settlements and send detailed PDF ledger statements or payment reminders directly to their WhatsApp with 1 tap.",
    },
    {
      category: "multi_store",
      q: "Can I manage multiple retail branches or warehouses?",
      a: "Yes. You can create unlimited business branches under one account. Switch between stores in 1 tap from both the desktop sidebar and mobile drawer without having to log in and out.",
    },
    {
      category: "security",
      q: "Is my store's financial data secure and backed up?",
      a: "Yes. CredSmart uses 256-bit TLS encryption in transit and at rest, multi-tenant Row-Level Security (RLS) on database tables, automated continuous cloud backups, and conforms with the Digital Personal Data Protection Act, 2023.",
    },
  ];

  const categories = [
    { id: "all", label: "All Questions" },
    { id: "general", label: "General & Pricing" },
    { id: "pos", label: "POS & Hardware" },
    { id: "gst", label: "GST & Tax Filing" },
    { id: "inventory", label: "Inventory & Barcodes" },
    { id: "khata", label: "Customer Khata" },
    { id: "multi_store", label: "Multi-Store" },
    { id: "security", label: "Security & Privacy" },
  ];

  const filteredFaqs = useMemo(() => {
    return faqData.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const matchQuery =
        !searchQuery.trim() ||
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [faqData, activeCategory, searchQuery]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Frequently Asked Questions (FAQ) — CredSmart POS"
        description="Find answers to all questions about CredSmart POS: free pricing, GST invoicing, thermal printers, barcode scanner setup, customer Khata, and multi-store management."
        keywords="CredSmart FAQ, free POS billing questions, GST invoice FAQ, thermal printer setup billing, barcode label maker questions, Udhar khata app FAQ"
        canonicalUrl="https://credsmart.in/faq"
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/80 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" /> Help &amp; Knowledge Center
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about CredSmart POS features, pricing, GST compliance, hardware setups, and data safety.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto pt-4 relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g. thermal printer, GST, pricing, held bills)..."
              className="h-12 pl-12 pr-4 glass-card-3d text-slate-900 dark:text-white rounded-2xl shadow-xl focus:border-amber-400 text-sm"
            />
          </div>
        </div>
      </section>

      {/* FAQ Categories & List */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                activeCategory === cat.id
                  ? "glowing-btn-amber text-white font-bold shadow-md"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3 pt-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <p className="text-base font-semibold">No questions found matching your search</p>
              <p className="text-xs">Try searching for other terms or clear your search query.</p>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndices.has(idx);
              return (
                <div
                  key={idx}
                  className="rounded-2xl glass-card-3d overflow-hidden transition-all relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-rose-600 rounded-l-2xl" />
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors cursor-pointer pl-6"
                  >
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180 text-amber-500 dark:text-amber-400"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/80 dark:border-slate-800/80 pt-4 pl-6 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
