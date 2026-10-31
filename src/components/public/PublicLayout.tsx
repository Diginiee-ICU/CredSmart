import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace(/^#/, "");
      // Slight delay ensures DOM tree is mounted on route transition
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          element.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
        } else {
          window.scrollTo(0, 0);
        }
      }, 60);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-[#FF6A00] selection:text-white">
      <PublicHeader />
      <main className="flex-1 w-full overflow-x-hidden relative min-h-0">{children}</main>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
