import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-[#FF6A00] selection:text-white">
      <PublicHeader />
      <main className="flex-1 w-full">{children}</main>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
