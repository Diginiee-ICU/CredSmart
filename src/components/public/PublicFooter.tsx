import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { APP_DOWNLOAD_LINKS } from "@/config/downloadLinks";
import { CredSmartLogo } from "./CredSmartLogo";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B132B] text-slate-400 border-t border-slate-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section: Brand + Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/60">
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <CredSmartLogo size="lg" variant="dark" />
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              India&apos;s all-in-one completely free business management platform. Invoicing, POS billing, inventory management, customer ledger, and intelligent credit risk mitigation for MSMEs and enterprises.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Free Forever
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> CredAlert Intelligence
              </span>
            </div>
          </div>

          {/* Column 1: Product Features */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
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
                  Customer Ledgers &amp; Udhar
                </Link>
              </li>
              <li>
                <Link to="/#ecosystem" className="hover:text-amber-400 transition-colors">
                  Business Ecosystem
                </Link>
              </li>
              <li>
                <Link to="/#intelligence" className="hover:text-amber-400 transition-colors">
                  CredAlert Intelligence
                </Link>
              </li>
              <li>
                <a
                  href={APP_DOWNLOAD_LINKS.androidApk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1 font-semibold text-emerald-400"
                >
                  Download Android APK
                </a>
              </li>
              <li>
                <a
                  href={APP_DOWNLOAD_LINKS.windowsExe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors inline-flex items-center gap-1 font-semibold text-blue-400"
                >
                  Download Windows PC (.exe)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Comparisons & Guides */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Resources &amp; Pricing
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pricing" className="hover:text-[#FF6A00] transition-colors font-semibold text-[#FF6A00]">
                  100% Free Forever
                </Link>
              </li>
              <li>
                <Link to="/gst-billing-guide" className="hover:text-slate-200 transition-colors">
                  GST Invoicing Guide
                </Link>
              </li>
              <li>
                <Link to="/barcode-generator-guide" className="hover:text-slate-200 transition-colors">
                  Barcode Label Guide
                </Link>
              </li>
              <li>
                <Link to="/e-invoicing-guide" className="hover:text-slate-200 transition-colors">
                  e-Invoicing IRN Guide
                </Link>
              </li>
              <li>
                <Link to="/compare-vyapar" className="hover:text-slate-200 transition-colors">
                  CredSmart vs Vyapar
                </Link>
              </li>
              <li>
                <Link to="/compare-mybillbook" className="hover:text-slate-200 transition-colors">
                  CredSmart vs myBillBook
                </Link>
              </li>
              <li>
                <Link to="/compare-tally" className="hover:text-slate-200 transition-colors">
                  CredSmart vs Tally Prime
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-slate-200 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Intelligence */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Company &amp; Trust
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-slate-200 transition-colors">
                  About CredSmart
                </Link>
              </li>
              <li>
                <a
                  href="https://www.credalert.business"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-200 transition-colors inline-flex items-center gap-1"
                >
                  CredAlert Network <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <Link to="/security" className="hover:text-slate-200 transition-colors">
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-slate-200 transition-colors">
                  Privacy Policy (DPDP 2023)
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-slate-200 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-slate-200 transition-colors">
                  Support &amp; Grievance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Disclaimers */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} CredSmart by CredAlert. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-slate-400 transition-colors">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="hover:text-slate-400 transition-colors">
              Terms
            </Link>
            <Link to="/security" className="hover:text-slate-400 transition-colors">
              Security
            </Link>
            <Link to="/contact" className="hover:text-slate-400 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
