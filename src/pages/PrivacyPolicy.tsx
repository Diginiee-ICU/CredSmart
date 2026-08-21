import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";

export default function PrivacyPolicy() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5" />
              Privacy & Security
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-slate-500 mt-1">Last Updated: August 2025</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Information We Collect</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              When you use CredSmart POS, we collect information necessary to provide you with point-of-sale, GST billing, and inventory services. This includes:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 leading-relaxed">
              <li><strong>Account Information:</strong> Your name, email address, phone number, and authentication credentials.</li>
              <li><strong>Business Information:</strong> Store name, business address, GSTIN, PAN, and contact details.</li>
              <li><strong>Store Operational Data:</strong> Item master catalogs, inventory levels, sale invoices, customer records, and supplier purchase records.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. How We Use Your Data</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your business and transactional data belongs exclusively to you. We use this data solely to:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 leading-relaxed">
              <li>Process POS billing, invoice generation, tax reporting, and inventory reconciliation.</li>
              <li>Authenticate your account securely across devices.</li>
              <li>Provide customer support and critical service notifications.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Data Security & Storage</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We employ enterprise-grade security protocols, encryption in transit (HTTPS/TLS), and secure cloud storage provided by Supabase. Your database is isolated with strict Row-Level Security (RLS) policies ensuring no unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Third-Party Sharing</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We do not sell, rent, or monetize your store data or customer details to any third-party advertisers or data brokers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Contact Us</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you have any questions regarding your data privacy or security, please contact our support team at <a href="mailto:support@credsmart.in" className="text-primary underline">support@credsmart.in</a>.
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
