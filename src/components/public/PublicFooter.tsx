import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  Heart,
  Globe,
  FileCheck,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#070C18] text-slate-400 border-t border-slate-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section: Brand + Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/60">
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">
                C
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                CredSmart <span className="text-amber-400 text-sm">POS</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              India&apos;s #1 100% Free GST Billing, POS &amp; Inventory ERP software. Designed to empower retail shops, wholesalers, distributors, and MSMEs across India with zero software costs.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Free Forever
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> DPDP 2023 Aligned
              </span>
            </div>
          </div>

          {/* Column 1: Product Features */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Product &amp; POS
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  POS Retail Billing
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  GST Invoicing &amp; Taxes
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  Inventory &amp; Godowns
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  Udhar Khata Ledgers
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  Barcode Label Studio
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  E-Invoicing &amp; e-Way Bills
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  B2B Vendor Discovery
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Comparisons & Guides */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Guides &amp; Compare
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pricing" className="hover:text-amber-400 transition-colors font-semibold text-amber-400">
                  ₹0 Free Pricing Matrix
                </Link>
              </li>
              <li>
                <Link to="/compare-vyapar" className="hover:text-amber-400 transition-colors">
                  CredSmart vs Vyapar
                </Link>
              </li>
              <li>
                <Link to="/compare-vyapar" className="hover:text-amber-400 transition-colors">
                  CredSmart vs myBillBook
                </Link>
              </li>
              <li>
                <Link to="/gst-billing-guide" className="hover:text-amber-400 transition-colors">
                  GST Invoicing Guide 2026
                </Link>
              </li>
              <li>
                <Link to="/gst-billing-guide" className="hover:text-amber-400 transition-colors">
                  CGST, SGST &amp; IGST Rules
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-amber-400 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Legal */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Trust &amp; Governance
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-amber-400 transition-colors">
                  About &amp; Mission
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:text-amber-400 transition-colors">
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-amber-400 transition-colors">
                  Grievance Officer
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-amber-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-amber-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-amber-400 transition-colors">
                  Section 2(1)(w) IT Act
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle Banner: Statutory Safe-Harbour & Compliance */}
        <div className="my-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              Statutory Intermediary Notice &amp; Compliance Statement
            </p>
            <p>
              CredSmart operates as an electronic billing platform and technology intermediary under Section 2(1)(w) of the Information Technology Act, 2000. All data is processed in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act).
            </p>
          </div>
          <Link
            to="/security"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition-colors"
          >
            Learn About Security →
          </Link>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {currentYear} CredSmart POS &amp; ERP. Built with pride for Indian Enterprises.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-white transition-colors">
              Support
            </Link>
            <span>•</span>
            <Link to="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
