import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Monitor,
} from "lucide-react";
import { APP_DOWNLOAD_LINKS } from "@/config/downloadLinks";
import { CredSmartLogo } from "./CredSmartLogo";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B132B] text-slate-400 border-t border-slate-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section: Brand + Dual-Suite Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 sm:gap-10 pb-12 border-b border-slate-800/60">
          
          {/* Brand & Mission Column (Spans 2 on Mobile/Desktop, 4 on Tablet) */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <CredSmartLogo size="lg" variant="dark" />
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              India&apos;s all-in-one completely free business management platform. Dual-suite POS billing ERP and Workforce CRM with intelligent credit risk mitigation for MSMEs and enterprises.
            </p>

            {/* Trust & Security Badges (Standardized to 11px) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Free Forever
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> 256-Bit SSL Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> CredAlert Intelligence
              </span>
            </div>

            {/* Official Native App Download Chips */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Official Native Apps
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={APP_DOWNLOAD_LINKS.androidApk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Android APK</span>
                </a>
                <a
                  href={APP_DOWNLOAD_LINKS.windowsExe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors"
                >
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Windows PC</span>
                </a>
              </div>
            </div>
          </div>

          {/* Column 1: POS & Billing ERP */}
          <div className="col-span-1 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              <span>POS &amp; Billing ERP</span>
              <span className="sr-only">Product &amp; POS</span>
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
                <Link to="/barcode-generator-guide" className="hover:text-amber-400 transition-colors">
                  Barcode Studio &amp; Labels
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
            </ul>
          </div>

          {/* Column 2: Workforce CRM */}
          <div className="col-span-1 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Workforce CRM
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  GPS Geofenced Attendance
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Automated Monthly Payroll
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Task Boards &amp; Kanban
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Team Meet &amp; Huddles
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Multi-Tier Staff Roles
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Bilingual Voice Copilot
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Team Announcements
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources & Pricing */}
          <div className="col-span-1 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Resources &amp; Pricing
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pricing" className="hover:text-[#FF6A00] transition-colors font-semibold text-[#FF6A00]">
                  100% Free Forever Plan
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

          {/* Column 4: Company & Trust */}
          <div className="col-span-1 space-y-3">
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

        {/* Bottom Bar: Copyright & Statutory Notes */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <p>© {currentYear} CredSmart by CredAlert. All rights reserved.</p>
            <span className="hidden sm:inline text-slate-700">•</span>
            <p className="text-slate-400">
              ₹0 Community Lifetime Free Retail POS ERP &amp; Workforce CRM
            </p>
          </div>
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
