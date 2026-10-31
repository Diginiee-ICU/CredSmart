import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, Download, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { APP_DOWNLOAD_LINKS } from "@/config/downloadLinks";
import { CredSmartLogo } from "./CredSmartLogo";

interface PublicHeaderProps {
  onOpenDownloadModal?: (platform: "android" | "desktop") => void;
}

export function PublicHeader({ onOpenDownloadModal }: PublicHeaderProps) {
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Helper to find target element with resilient dual-suite fallback
  const findTargetElement = (id: string) => {
    return (
      document.getElementById(id) ||
      (id === "billing-erp" || id === "workforce-crm" ? document.getElementById("suites") : null) ||
      (id === "suites" ? (document.getElementById("billing-erp") || document.getElementById("workforce-crm")) : null)
    );
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Smooth scroll to hash anchor after cross-page navigation
  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const targetId = location.hash.replace("#", "");
      const timer = setTimeout(() => {
        const element = findTargetElement(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash]);

  const targetAppRoute = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "POS & Billing ERP", shortLabel: "POS Billing", href: "/#suites" },
    { label: "Workforce CRM", href: "/#suites" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Ecosystem", href: "/#ecosystem" },
    { label: "CredAlert Intel", href: "/#intelligence" },
    { label: "Download", href: "/#download" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith("/#") || href.startsWith("#")) {
      const targetHash = href.startsWith("/#") ? href.slice(1) : href; // e.g. "#suites"
      const targetId = targetHash.replace("#", "");
      if (location.pathname !== "/") {
        navigate(`/${targetHash}`);
      } else {
        const element = findTargetElement(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
        navigate(`/${targetHash}`);
      }
    } else {
      navigate(href);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full h-12 sm:h-13 transition-colors duration-150 bg-white/95 backdrop-blur-md border-b flex items-center select-none",
        scrolled
          ? "border-slate-200/80 shadow-2xs"
          : "border-slate-200/40"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between w-full">
        {/* Brand Logo with Shield and "by CredAlert" */}
        <Link to="/" className="focus:outline-none flex items-center py-0.5">
          <CredSmartLogo size="md" className="scale-110 sm:scale-100 origin-left" />
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-3.5 2xl:gap-5">
          {navLinks.map((link) => {
            const isAnchor = link.href.startsWith("/#") || link.href.startsWith("#");
            const targetHash = isAnchor ? (link.href.startsWith("/#") ? link.href.slice(1) : link.href) : null;
            const isExactActive = isAnchor
              ? location.pathname === "/" && location.hash === targetHash
              : location.pathname === link.href && (!location.hash || link.href !== "/");

            const commonClasses = cn(
              "text-xs xl:text-[13px] transition-colors whitespace-nowrap py-1 cursor-pointer",
              isExactActive
                ? "font-semibold text-blue-600"
                : "font-medium text-slate-600 hover:text-slate-900"
            );

            const content = link.shortLabel ? (
              <>
                <span className="hidden xl:inline">{link.label}</span>
                <span className="xl:hidden">{link.shortLabel}</span>
              </>
            ) : (
              <span>{link.label}</span>
            );

            return isAnchor ? (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={commonClasses}
              >
                {content}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className={commonClasses}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Download App Quick Trigger */}
          <button
            type="button"
            onClick={() => {
              if (onOpenDownloadModal) {
                onOpenDownloadModal("android");
              } else {
                handleNavClick("/#download");
              }
            }}
            className="h-8.5 px-3 rounded-lg border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors duration-150 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden xl:inline">Download App</span>
            <span className="xl:hidden">App</span>
          </button>

          {user ? (
            <Link to={targetAppRoute}>
              <Button className="h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors duration-150 flex items-center gap-1.5">
                Open Workspace <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to={`${ROUTE_PATHS.auth}?mode=login`}>
                <button
                  type="button"
                  className="h-8.5 px-3 rounded-lg border border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors duration-150 cursor-pointer"
                >
                  Login
                </button>
              </Link>
              <Link to={`${ROUTE_PATHS.auth}?mode=signup`}>
                <button
                  type="button"
                  className="h-8.5 px-3 rounded-lg bg-[#FF6A00] hover:bg-[#E65F00] text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors duration-150 cursor-pointer flex items-center gap-1"
                >
                  Start Free
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle (44x44px minimum touch target) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-drawer"
          className="lg:hidden absolute top-full left-0 right-0 w-full max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-xl animate-in slide-in-from-top-4 duration-200"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isAnchor = link.href.startsWith("/#") || link.href.startsWith("#");
              const targetHash = isAnchor ? (link.href.startsWith("/#") ? link.href.slice(1) : link.href) : null;
              const isExactActive = isAnchor
                ? location.pathname === "/" && location.hash === targetHash
                : location.pathname === link.href;

              const linkClasses = cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between",
                isExactActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              );

              return isAnchor ? (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                    setMobileMenuOpen(false);
                  }}
                  className={linkClasses}
                >
                  <span>{link.label}</span>
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={linkClasses}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Quick App Downloads in Mobile Drawer */}
            <div className="pt-3 mt-1 border-t border-slate-100 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono px-3">
                Download Native Apps
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={APP_DOWNLOAD_LINKS.androidApk}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 no-underline cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Android APK</span>
                </a>
                <a
                  href={APP_DOWNLOAD_LINKS.windowsExe}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-800 text-xs font-semibold flex items-center justify-center gap-1.5 no-underline cursor-pointer"
                >
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <span>Windows PC</span>
                </a>
              </div>
            </div>

            <div className="pt-3 mt-1 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <Link to={targetAppRoute} className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full h-9.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5">
                    Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={`${ROUTE_PATHS.auth}?mode=login`} className="w-full" onClick={() => setMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full h-9.5 rounded-lg border border-slate-200/80 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors cursor-pointer flex items-center justify-center"
                    >
                      Login
                    </button>
                  </Link>
                  <Link to={`${ROUTE_PATHS.auth}?mode=signup`} className="w-full" onClick={() => setMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full h-9.5 rounded-lg bg-[#FF6A00] hover:bg-[#E65F00] text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      Start Free Now
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default PublicHeader;
