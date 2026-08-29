import { Link } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  Lock,
  Database,
  CheckCircle2,
  Server,
  FileCheck,
  Scale,
  Sparkles,
  ArrowRight,
  KeyRound,
  HardDriveDownload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEOHead } from "@/components/public/SEOHead";
import { ROUTE_PATHS } from "@/config/routes";

export default function Security() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "CredSmart Security & Data Privacy Architecture",
    description:
      "Overview of CredSmart's bank-grade security infrastructure: 256-bit encryption, Row-Level Security (RLS), DPDP 2023 compliance, and automated backups.",
    url: "https://pos.credalert.bussiness/security",
  };

  const securityFeatures = [
    {
      icon: Lock,
      title: "256-Bit End-to-End Encryption",
      desc: "All communication between your browser or mobile device and our cloud servers is encrypted via TLS 1.3 with 256-bit AES encryption. Invoices and customer financial data are encrypted both in transit and at rest.",
    },
    {
      icon: Database,
      title: "Multi-Tenant Row-Level Security (RLS)",
      desc: "Every database query is cryptographically scoped to your authenticated organization ID. No business or staff member can access or view another merchant's transactions, ledgers, or customer data.",
    },
    {
      icon: ShieldCheck,
      title: "DPDP Act, 2023 Compliance",
      desc: "Designed strictly in accordance with the Digital Personal Data Protection Act, 2023. Purpose-bound data collection, consent logs, and prompt data-principal rights execution within 30 days.",
    },
    {
      icon: FileCheck,
      title: "Immutable Append-Only Audit Trail",
      desc: "Every invoice creation, void, stock deduction, price adjustment, and refund generates an immutable, timestamped audit log containing the user identity, role, and action context.",
    },
    {
      icon: HardDriveDownload,
      title: "Automated Continuous Backups",
      desc: "Your data is continuously backed up across redundant cloud availability zones. Even if your hardware fails or a laptop is stolen, your business records remain safely restored instantly.",
    },
    {
      icon: KeyRound,
      title: "Granular Role-Based Access Control (RBAC)",
      desc: "Assign distinct roles (Owner, Manager, Cashier) to your store team. Cashiers cannot see profit margins or supplier costs, preventing confidential data leaks.",
    },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="Security & Data Privacy Architecture — CredSmart by CredAlert"
        description="Learn how CredSmart protects your business billing and accounting records with 256-bit SSL encryption, Supabase RLS, immutable audit logs, and DPDP alignment."
        keywords="CredSmart security, billing software encryption, safe GST invoice cloud, DPDP 2023 compliance, row level security POS, business data protection"
        canonicalUrl="https://pos.credalert.bussiness/security"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Security Architecture", url: "/security" },
        ]}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/80 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> Institutional Security Standards
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Bank-Grade Security for Your Commercial Ledger
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your billing records, tax calculations, customer ledgers, and trade secrets are protected with modern cloud cryptography and statutory safeguards.
          </p>
        </div>
      </section>

      {/* Security Architecture Grid */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl glass-card-3d space-y-4 hover:border-indigo-400/40 transition-colors relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-blue-500 to-cyan-500 rounded-l-2xl" />
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{sec.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{sec.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Section 2(1)(w) IT Act Card */}
        <div className="mt-12 p-8 rounded-3xl glass-card-3d space-y-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-rose-600 rounded-l-2xl" />
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-500" />
            Statutory Intermediary Compliance &amp; Legal Safe-Harbour
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            CredSmart POS operates as a digital technology intermediary governed by Section 2(1)(w) of the Information Technology Act, 2000. We do not alter or tamper with commercial records created by businesses. All commercial disputes, Right-of-Reply workflows, and legal hold processes follow statutory guidelines.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}

