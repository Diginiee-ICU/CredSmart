import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(ROUTE_PATHS.landing)}
            className="flex items-center gap-2 text-slate-700 hover:text-primary transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <Store className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900">CredSmart POS</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3">
              <FileText className="w-3.5 h-3.5" />
              User Agreement
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
            <p className="text-sm text-slate-500 mt-1">Last Updated: August 2025</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              By accessing or using CredSmart POS ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Free Service Guarantee</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              CredSmart POS provides GST billing, inventory management, customer ledger, and analytics features free of charge to retail and wholesale businesses across India. There are no mandatory subscription fees or trial limits for core features.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. User Responsibilities & Data Accuracy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You are responsible for safeguarding your login credentials, accurately configuring GST tax rates, maintaining true inventory and billing records, and complying with applicable Indian taxation laws and GST guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Intellectual Property</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              CredSmart POS and its original content, features, and functionality remain the exclusive property of CredSmart POS. Your business data (products, prices, customer lists, transactions) remains 100% your property.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Limitation of Liability</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              CredSmart POS is provided on an "AS IS" and "AS AVAILABLE" basis. While we maintain high uptime and cloud reliability, we are not liable for any indirect or consequential damages arising from internet interruptions or third-party hardware failures.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Button onClick={() => navigate(ROUTE_PATHS.auth)} className="rounded-xl">
              Get Started with CredSmart POS
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
