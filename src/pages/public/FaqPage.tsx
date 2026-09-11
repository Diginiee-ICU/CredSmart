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
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaqIndices, setOpenFaqIndices] = useState<Set<number>>(new Set([0, 1]));

  const faqData = [
    {
      category: "general",
      q: "What is CredSmart?",
      a: "CredSmart is India's free GST billing, point-of-sale, and inventory management software by CredAlert. It allows retail shop owners, wholesalers, and distributors to generate GST invoices, manage stock, track customer Udhar Khata, design barcode labels, and file GSTR-1 returns with zero software cost.",
    },
    {
      category: "general",
      q: "Is CredSmart really 100% free forever?",
      a: "Yes. CredSmart has zero software fees, zero monthly or annual subscriptions, zero transaction commissions on standard cash/UPI sales, and no hidden trial limits. You get full access to all modules from day one.",
    },
    {
      category: "general",
      q: "How does CredSmart compare to Vyapar or myBillBook?",
      a: "Unlike Vyapar and myBillBook which charge ₹3,000 to ₹7,000 annually per computer, CredSmart is completely free. In addition, CredSmart offers built-in barcode label design, 1-tap multi-store switching, real-time cloud sync across devices, and access to a directory of 3.2M+ verified Indian businesses.",
    },
    {
      category: "pos",
      q: "Which thermal printers and barcode scanners are supported?",
      a: "CredSmart is compatible with all standard ESC/POS USB, Bluetooth, and Wi-Fi thermal printers (both 2-inch 58mm and 3-inch 80mm rolls) such as TVS, Epson, Everycom, NGX, and Pegasus. It also works with all standard USB and wireless handheld 1D/2D barcode scanners.",
    },
    {
      category: "pos",
      q: "Can I bill multiple customers at once during rush hours?",
      a: "Yes. The POS Billing Terminal supports up to 5 concurrent 'Held Bills'. If a customer forgets an item or delays payment, you can park their cart, bill the next customer, and resume the held bill instantly.",
    },
    {
      category: "gst",
      q: "Does CredSmart support all GST tax slabs (0%, 5%, 12%, 18%, 28%)?",
      a: "Yes. CredSmart supports all official GST tax rates, composite schemes, nil-rated items, and automated intra-state (CGST + SGST) vs inter-state (IGST) tax calculation based on customer and store state codes.",
    },
    {
      category: "gst",
      q: "How do I export my monthly GSTR-1 tax filing report?",
      a: "Go to Reports > GSTR-1 Report. You can export official GST Portal JSON Schema 2.0 files or multi-sheet Excel workbooks ready to upload directly to the GSTN portal or email to your CA in 1 click.",
    },
    {
      category: "inventory",
      q: "Can I print barcode labels for loose items without manufacturer barcodes?",
      a: "Yes. CredSmart includes a built-in Barcode & QR Code Label Designer. You can generate custom Code 128 or EAN-13 barcodes, format price stickers, and print them onto thermal roll rolls or standard A4 sheets.",
    },
    {
      category: "inventory",
      q: "Does CredSmart support multiple warehouses or godowns?",
      a: "Yes. You can create multiple godowns, record inter-godown transfers, track stock levels by location, and set minimum stock alerts for each warehouse.",
    },
    {
      category: "khata",
      q: "How does Customer Udhar Khata work with WhatsApp?",
      a: "Every credit sale is automatically logged to the customer's digital ledger. You can view running balances, record partial settlements, and send formatted PDF statement summaries directly to the customer's WhatsApp with 1 tap.",
    },
    {
      category: "multi_store",
      q: "Can I manage multiple retail branches under one account?",
      a: "Yes. You can add multiple shops or branches under your account and switch between them instantly in 1 tap without logging out.",
    },
    {
      category: "security",
      q: "Is my store's financial data secure and private?",
      a: "Yes. All data is encrypted with 256-bit SSL encryption, protected by multi-tenant Row-Level Security (RLS), and backed up continuously across secure cloud servers. We strictly adhere to the DPDP Act, 2023.",
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
        title="Frequently Asked Questions (FAQ) — CredSmart by CredAlert"
        description="Find answers to all questions about CredSmart: free pricing, GST invoicing, thermal printers, barcode scanner setup, customer Khata, and multi-store management."
        keywords="CredSmart FAQ, free POS billing questions, GST invoice FAQ, thermal printer setup billing, barcode label maker questions, Udhar khata app FAQ"
        canonicalUrl="https://pos.credalert.bussiness/faq"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Help &amp; Knowledge Center
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about CredSmart POS, 100% free pricing, hardware setups, and GST compliance.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto pt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search questions (e.g. thermal printer, GST filing, pricing)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-13 rounded-2xl bg-white border-slate-200 shadow-sm text-slate-900 focus:border-blue-600 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories & Accordions */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Category Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeCategory === cat.id
                  ? "bg-[#0A1931] text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordions */}
        <div className="space-y-3.5">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
              <p className="text-slate-600 font-medium text-sm">No matching questions found for "{searchQuery}".</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="mt-4 border-slate-300 text-slate-700"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndices.has(idx);
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-base font-bold text-[#0A1931] flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-[#FF6A00] shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0",
                        isOpen && "rotate-180 text-slate-900"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pl-13">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Still Have Questions?"
        highlightedText="We're Here to Help."
        subtitle="Start your free account now or speak with our support team."
        ctaText="Get Started 100% Free"
      />
    </PublicLayout>
  );
}
