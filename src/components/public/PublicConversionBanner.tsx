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
  title = "Ready to Upgrade Your Billing Experience?",
  highlightedText = "100% Free Forever.",
  subtitle = "Join thousands of Indian shop owners and enterprises who trust CredSmart. No credit card required.",
  ctaText = "Start Free Now",
}: PublicConversionBannerProps) {
  return (
    <section className={cn("py-12 sm:py-16", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-8 sm:p-12 shadow-2xl text-white flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-64 h-64 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Left Content */}
          <div className="flex items-center gap-5 text-left z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-2xl sm:text-3xl shadow-xl shrink-0">
              🚀
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                {title}{" "}
                {highlightedText && (
                  <span className="text-amber-300 drop-shadow-sm">{highlightedText}</span>
                )}
              </h3>
              <p className="text-sm sm:text-base text-blue-100 mt-2 max-w-xl leading-relaxed font-medium">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Center Badges (Desktop) */}
          <div className="hidden xl:flex flex-col gap-2 text-xs font-semibold text-blue-100 z-10 shrink-0">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              Unlimited GST Invoices
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              Real-Time Cloud Sync
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              Zero Hidden Charges
            </span>
          </div>

          {/* Right CTA */}
          <div className="shrink-0 w-full sm:w-auto z-10">
            <Link to={ROUTE_PATHS.auth} className="block w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto h-13 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-800 font-black text-sm sm:text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 text-blue-800 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
              </button>
            </Link>
            <p className="text-[11px] text-blue-200 mt-2 text-center font-medium">
              Instant 30-Second Setup • No Credit Card
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PublicConversionBanner;
