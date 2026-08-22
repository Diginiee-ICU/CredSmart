import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Sparkles,
  ArrowRight,
  Shield,
  ChevronDown,
  Layers,
  FileCheck,
  CheckCircle2,
  Lock,
  HelpCircle,
  Phone,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "GST Guide", href: "/gst-billing-guide" },
    { label: "Compare", href: "/compare-vyapar" },
    { label: "Security", href: "/security" },
    { label: "FAQ", href: "/faq" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-xl border-b",
        scrolled
          ? "bg-[#0B1120]/90 border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
          : "bg-[#0B1120]/75 border-slate-800/60"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            C
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              CredSmart <span className="text-amber-400 text-sm uppercase px-1.5 py-0.5 rounded bg-amber-400/10 font-bold border border-amber-400/20">POS</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              Free GST Billing &amp; Invoicing
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.slice(0, 6).map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-amber-500/15 text-amber-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                )}
              >
                {link.label}
              </Link>
            );
          })}

          {/* More Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1"
            >
              <span>Company</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-transform group-hover:rotate-180" />
            </button>

            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              <Link
                to="/about"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Scale className="w-4 h-4 text-amber-400" />
                <span>About &amp; DPDP</span>
              </Link>
              <Link
                to="/contact"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Contact &amp; Grievance</span>
              </Link>
              <Link
                to="/security"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Security Architecture</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <Link to={ROUTE_PATHS.dashboard}>
              <Button className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                Open Workspace <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to={ROUTE_PATHS.auth}>
                <Button
                  variant="ghost"
                  className="h-10 px-4 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold"
                >
                  Sign In
                </Button>
              </Link>
              <Link to={ROUTE_PATHS.auth}>
                <Button className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                  Start Free Billing <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900/98 border-t border-slate-800 px-4 py-6 space-y-3 shadow-2xl animate-in slide-in-from-top-5 duration-200">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-800">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors",
                  location.pathname === link.href
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {user ? (
              <Link to={ROUTE_PATHS.dashboard} className="w-full">
                <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm shadow-md">
                  Go to Workspace <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to={ROUTE_PATHS.auth} className="w-full">
                  <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm shadow-md">
                    Start Free Billing <Sparkles className="w-4 h-4 ml-2 text-slate-950" />
                  </Button>
                </Link>
                <Link to={ROUTE_PATHS.auth} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-xl border-slate-700 bg-slate-800/60 text-slate-200 font-semibold text-xs"
                  >
                    Already have an account? Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default PublicHeader;
