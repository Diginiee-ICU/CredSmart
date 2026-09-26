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

  const targetAppRoute = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Ecosystem", href: "/#ecosystem" },
    { label: "CredAlert Intel", href: "/#intelligence" },
    { label: "Download", href: "/#download" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith("/#")) {
      const elementId = href.replace("/#", "");
      if (location.pathname !== "/") {
        navigate(`/${href}`);
      } else {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200 bg-white/95 backdrop-blur-md",
        scrolled
          ? "border-b border-slate-200/80 shadow-sm py-2.5"
          : "border-b border-transparent py-3 sm:py-4"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo with Shield and "by CredAlert" */}
        <Link to="/" className="focus:outline-none flex items-center py-0.5">
          <CredSmartLogo size="md" className="scale-110 sm:scale-100 origin-left" />
        </Link>

        {/* Center Navigation Links (Exact from Reference Image) */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => {
            const isExactActive = location.pathname === link.href;
            return link.href.startsWith("/#") ? (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="text-[15px] font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className={cn(
                  "text-[15px] transition-colors",
                  isExactActive
                    ? "font-bold text-slate-950"
                    : "font-medium text-slate-600 hover:text-slate-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
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
            className="h-10 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Download App</span>
            <span className="md:hidden">App</span>
          </button>

          {user ? (
            <Link to={targetAppRoute}>
              <Button className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                Open Workspace <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to={`${ROUTE_PATHS.auth}?mode=login`}>
                <button
                  type="button"
                  className="h-10 px-4.5 rounded-xl border border-blue-600/80 text-blue-600 hover:bg-blue-50 font-semibold text-sm transition-all cursor-pointer"
                >
                  Login
                </button>
              </Link>
              <Link to={`${ROUTE_PATHS.auth}?mode=signup`}>
                <button
                  type="button"
                  className="h-10 px-5 rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white font-semibold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Start Free
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-5 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  if (link.href.startsWith("/#")) {
                    e.preventDefault();
                    handleNavClick(link.href);
                    setMobileMenuOpen(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </a>
            ))}

            {/* Quick App Downloads in Mobile Drawer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono px-3">
                Download Native Apps
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={APP_DOWNLOAD_LINKS.androidApk}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 no-underline cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Android APK</span>
                </a>
                <a
                  href={APP_DOWNLOAD_LINKS.windowsExe}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 no-underline cursor-pointer"
                >
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <span>Windows PC</span>
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              {user ? (
                <Link to={targetAppRoute} className="w-full">
                  <Button className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold">
                    Open Workspace
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={`${ROUTE_PATHS.auth}?mode=login`} className="w-full">
                    <button
                      type="button"
                      className="w-full h-11 rounded-xl border border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition"
                    >
                      Login
                    </button>
                  </Link>
                  <Link to={`${ROUTE_PATHS.auth}?mode=signup`} className="w-full">
                    <button
                      type="button"
                      className="w-full h-11 rounded-xl bg-[#FF6A00] text-white font-bold hover:bg-[#E65F00] shadow-md transition"
                    >
                      Start Free Now 🚀
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
