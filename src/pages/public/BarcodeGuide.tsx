import { Link } from "react-router-dom";
import {
  QrCode,
  Barcode,
  Printer,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { ROUTE_PATHS } from "@/config/routes";

export default function BarcodeGuide() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "The Complete Guide to Barcode Label Generation & Printing for Indian Retailers",
      description:
        "Learn how to generate, design, and print barcode stickers, Code 128, and EAN-13 price labels for retail shops using thermal printers and A4 sticker sheets.",
      author: {
        "@type": "Organization",
        name: "CredSmart Research Team",
      },
      publisher: {
        "@type": "Organization",
        name: "CredSmart by CredAlert",
        logo: {
          "@type": "ImageObject",
          url: "https://pos.credalert.bussiness/favicon.png",
        },
      },
      datePublished: "2026-01-01",
      dateModified: "2026-08-30",
      mainEntityOfPage: "https://pos.credalert.bussiness/barcode-generator-guide",
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Print Custom Barcode Price Stickers for Retail Items",
      step: [
        {
          "@type": "HowToStep",
          name: "Add Item to Inventory Catalog",
          text: "Enter your product name, selling price, and MRP in CredSmart.",
        },
        {
          "@type": "HowToStep",
          name: "Auto-Generate Barcode SKU",
          text: "Let CredSmart auto-generate a unique Code-128 barcode or enter existing manufacturer EAN-13 number.",
        },
        {
          "@type": "HowToStep",
          name: "Choose Printer & Label Layout",
          text: "Select your thermal label roll size (50x38mm, 38x25mm) or standard A4 sticker paper (24/40/65 per sheet).",
        },
        {
          "@type": "HowToStep",
          name: "Batch Print Stickers",
          text: "Print barcodes directly from your browser with zero 3rd-party software required.",
        },
      ],
    },
  ];

  const barcodeFormats = [
    { format: "Code 128", bestFor: "In-house SKU tags, warehouse inventory, alphanumeric codes", density: "High", chars: "All 128 ASCII characters" },
    { format: "EAN-13", bestFor: "Standard packaged retail consumer goods across India", density: "Fixed 13 Digits", chars: "Numeric (0-9)" },
    { format: "QR Code", bestFor: "UPI payments, product batch URLs, mobile scanning", density: "2D Matrix", chars: "Binary / URL / Text" },
    { format: "UPC-A", bestFor: "Imported packaged consumer merchandise", density: "Fixed 12 Digits", chars: "Numeric (0-9)" },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="Barcode Label Generator Guide — Free Retail Sticker Printing | CredSmart"
        description="Comprehensive guide on barcode label design, thermal roll sticker printing, Code 128 generation, and A4 multi-label layouts for retail stores in India."
        keywords="barcode generator guide India, free barcode sticker maker, Code 128 label designer, EAN 13 barcode generator free, thermal roll barcode printer India"
        canonicalUrl="https://pos.credalert.bussiness/barcode-generator-guide"
        ogType="article"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Barcode Guide", url: "/barcode-generator-guide" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Retail Hardware &amp; Label Studio
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0A1931] tracking-tight leading-tight">
            The Complete Guide to Barcode Label Printing for Retail
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Learn how to design, format, and print professional barcode price tags and SKU stickers for your retail store with zero subscription fees.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Barcode Formats Table */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#0A1931]">1. Understanding Barcode Formats in Indian Retail</h2>
          <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="p-4">Barcode Symbology</th>
                  <th className="p-4">Best Used For</th>
                  <th className="p-4">Density / Capacity</th>
                  <th className="p-4">Supported Characters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {barcodeFormats.map((b, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-amber-700 font-mono">{b.format}</td>
                    <td className="p-4 font-semibold text-slate-900">{b.bestFor}</td>
                    <td className="p-4 text-slate-600">{b.density}</td>
                    <td className="p-4 text-slate-600">{b.chars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Thermal Roll vs A4 Sheets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#0A1931]">Thermal Roll Label Printers</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ideal for high-volume billing counters and clothing boutiques (TVS, TSC, Xprinter, Zebra). Prints individual continuous adhesive stickers (50x38mm, 38x25mm) with zero ink or ribbon costs.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#0A1931]">Standard A4 Sticker Sheets</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Use your existing laser or inkjet printer with pre-die-cut A4 adhesive paper. Supports standard 24 labels, 40 labels, and 65 labels per page with automatic edge alignment.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <PublicConversionBanner
        title="Ready to Print Custom Barcode Stickers?"
        highlightedText="100% Free."
        subtitle="CredSmart includes a full-featured Barcode & QR Code Label Designer with zero addon fees."
        ctaText="Design Barcodes Free"
      />
    </PublicLayout>
  );
}
