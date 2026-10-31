import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

interface PublicConversionBannerProps {
  className?: string;
  title?: string;
  highlightedText?: string;
  subtitle?: string;
  ctaText?: string;
}

export function PublicConversionBanner({
  className,
  title = "Ready to Run Your Entire Business on One Platform?",
  highlightedText = "100% Free Forever.",
  subtitle = "Join thousands of Indian retail shops and workforce teams who trust CredSmart. No credit card required.",
  ctaText = "Start Free Now",
}: PublicConversionBannerProps) {
  return (
    <section className={cn("py-8 sm:py-12", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-6 sm:p-8 border border-blue-500/20 shadow-lg text-white flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Left Content */}
          <div className="flex items-center gap-4 sm:gap-5 text-left z-10">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              🚀
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug">
                {title}{" "}
                {highlightedText && (
                  <span className="text-amber-300 drop-shadow-xs">{highlightedText}</span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-1.5 max-w-xl leading-relaxed font-normal">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Center Badges (Desktop) */}
          <div className="hidden xl:flex flex-col gap-1.5 text-xs font-semibold text-blue-100 z-10 shrink-0">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              Unlimited POS Invoices &amp; Khata
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              GPS Attendance &amp; Staff Payroll
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              100% Free Forever • Zero Hidden Fees
            </span>
          </div>

          {/* Right CTA - Strictly adheres to Rule 1 Standard Hero CTA dimensions */}
          <div className="shrink-0 w-full sm:w-auto z-10">
            <Link to={ROUTE_PATHS.auth} className="block w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto h-9.5 px-4.5 rounded-lg bg-white hover:bg-slate-50 text-blue-700 font-semibold text-sm shadow-xs active:scale-[0.98] transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 text-blue-700 group-hover:translate-x-0.5 transition-transform stroke-[2]" />
              </button>
            </Link>
            <p className="text-[11px] text-blue-200 mt-1.5 text-center font-medium">
              Instant 30-Second Setup • No Credit Card
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PublicConversionBanner;
