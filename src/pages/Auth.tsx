import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Lock, User, Building2, ArrowRight, Phone, MapPin,
  ArrowLeft, Upload, FileText, Image as ImageIcon, X, Globe,
  KeyRound, CheckCircle2, Landmark, CreditCard, QrCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { seedProductsByBusinessType } from "@/data/seed-products";
import { WebsiteProductImport } from "@/components/WebsiteProductImport";
import { productsApi } from "@/services/productsApi";
import { settingsApi } from "@/services/settingsApi";
import { ROUTE_PATHS, SuitePreference, resolvePostLoginRoute, completeOnboardingSuiteSetup } from "@/config/routes";
import { OnboardingSuiteSelector } from "@/components/OnboardingSuiteSelector";
import { useOrganization, getPendingOnboarding, setPendingOnboarding, clearPendingOnboarding, PendingOnboardingData } from "@/hooks/useOrganization";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CredSmartLogo } from "@/components/public/CredSmartLogo";

const businessTypes = [
  "Grocery",
  "Pharmacy",
  "Hardware",
  "F&B / Restaurant",
  "Clothing & Apparel",
  "Electronics",
  "General Store",
  "Other",
];

const inputClass = "w-full h-11 pl-10 pr-4 rounded-xl glass-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-sm font-sans";

const isMissingBootstrapFunction = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  if (error.code === "PGRST202") return true;
  const message = error.message?.toLowerCase() || "";
  return (
    message.includes("could not find the function") ||
    (message.includes("bootstrap_organization") && message.includes("does not exist"))
  );
};

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState(1);
  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  // Store
  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  // Invoicing & Logo
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [scrapedProducts, setScrapedProducts] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Bank & UPI Details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [upiId, setUpiId] = useState("");
  const [suitePreference, setSuitePreference] = useState<SuitePreference>("both");

  // Password reset state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh: refreshOrganization } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }

    try {
      if (data.user) {
        await completePendingOnboarding(data.user.id);
      }
      await refreshOrganization();

      // Check role to direct to proper landing surface
      const { data: memberships } = await settingsApi.getMemberships(undefined, data.user.id);
      const membership = memberships && memberships.length > 0 ? memberships[0] : null;

      const targetRoute = resolvePostLoginRoute(membership?.role);
      navigate(targetRoute);
    } catch (setupErr) {
      toast({
        title: "Store setup failed",
        description: setupErr instanceof Error ? setupErr.message : "Please try signing in again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      } else {
        setResetSent(true);
        toast({ title: "Email sent", description: "Check your email inbox for password reset instructions." });
      }
    } catch (err: unknown) {
      toast({ title: "Reset error", description: err.message || "Failed to send reset link", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const productKey = (name: string, barcode: string) =>
    `${name.trim().toLowerCase()}|${barcode.trim()}`;

  const buildPendingOnboardingPayload = (): PendingOnboardingData => ({
    email: email.trim(),
    storeName: storeName.trim(),
    businessType,
    suitePreference,
    storeAddress: storeAddress.trim(),
    storePhone: storePhone.trim(),
    storeEmail: (storeEmail || email).trim(),
    gstin: gstin.trim().toUpperCase(),
    pan: pan.trim().toUpperCase(),
    taxRate: parseFloat(taxRate) || 18,
    invoicePrefix: (invoicePrefix || "INV").trim().toUpperCase(),
    bankName: bankName.trim(),
    accountNumber: accountNumber.trim(),
    ifsc: ifsc.trim().toUpperCase(),
    accountHolder: accountHolder.trim() || storeName.trim(),
    upiId: upiId.trim(),
    scrapedProducts: scrapedProducts.map((sp) => ({
      name: String(sp.name || "").trim(),
      barcode: String(sp.barcode || "").trim(),
      brand: String(sp.brand || "").trim(),
      category: String(sp.category || "").trim(),
      costPrice: Number(sp.costPrice) || 0,
      mrp: Number(sp.mrp) || 0,
    })),
  });

  const uploadLogo = async (userId: string) => {
    if (!logoFile) return "";

    const fileExt = logoFile.name.split(".").pop();
    const filePath = `${userId}/logo.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("store-logos")
      .upload(filePath, logoFile, { upsert: true });

    if (uploadError) return "";

    const { data: urlData } = supabase.storage
      .from("store-logos")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const seedOrgProducts = async (orgId: string, payload: PendingOnboardingData) => {
    const baseSeeds = seedProductsByBusinessType[payload.businessType] || seedProductsByBusinessType["Other"] || [];

    const onboardingProducts: OnboardingProductSeed[] = [
      ...baseSeeds.map((sp) => ({
        name: sp.name,
        barcode: sp.barcode,
        brand: sp.brand,
        category: sp.category,
        costPrice: sp.batch.costPrice,
        mrp: sp.batch.mrp,
        stock: sp.batch.stock,
        batchNumber: sp.batch.batchNumber,
      })),
      ...payload.scrapedProducts.map((sp, idx) => ({
        name: sp.name,
        barcode: sp.barcode,
        brand: sp.brand,
        category: sp.category,
        costPrice: sp.costPrice,
        mrp: sp.mrp,
        stock: 0,
        batchNumber: `IMPORTED-${String(idx + 1).padStart(2, "0")}`,
      })),
    ].filter((p) => p.name.trim().length > 0);

    if (onboardingProducts.length === 0) return;

    const { data: existingProducts, error: existingError } = await productsApi.getProducts(orgId);

    if (existingError) {
      throw new Error(`Failed to check existing products: ${existingError.message}`);
    }

    const existingKeys = new Set(
      (existingProducts || []).map((p) => productKey(p.name || "", p.barcode || ""))
    );

    const uniqueCandidates: OnboardingProductSeed[] = [];
    const candidateKeys = new Set<string>();

    onboardingProducts.forEach((product) => {
      const key = productKey(product.name, product.barcode);
      if (existingKeys.has(key) || candidateKeys.has(key)) return;
      candidateKeys.add(key);
      uniqueCandidates.push(product);
    });

    if (uniqueCandidates.length === 0) return;

    const createdResults = await Promise.all(
      uniqueCandidates.map((product) =>
        productsApi.createProduct(
          {
            name: product.name,
            barcode: product.barcode,
            brand: product.brand,
            category: product.category,
          },
          orgId
        )
      )
    );

    const insertedProducts = createdResults
      .map((r) => r.data)
      .filter((p): p is NonNullable<typeof p> => Boolean(p && p.id));

    if (insertedProducts.length === 0) return;

    const batchesToInsert = insertedProducts
      .map((product) => {
        const match = uniqueCandidates.find(
          (candidate) => productKey(candidate.name, candidate.barcode) === productKey(product.name, product.barcode || "")
        );

        if (!match) return null;

        return {
          productId: product.id,
          batchNumber: match.batchNumber,
          costPrice: match.costPrice,
          mrp: match.mrp,
          stock: match.stock,
        };
      })
      .filter((batch): batch is NonNullable<typeof batch> => Boolean(batch));

    if (batchesToInsert.length === 0) return;

    const { error: insertBatchesError } = await productsApi.bulkUpsertBatches(batchesToInsert, orgId);

    if (insertBatchesError) {
      throw new Error(`Failed to create product batches: ${insertBatchesError.message}`);
    }
  };

  const completePendingOnboarding = async (userId: string, logoUrl = "") => {
    const payload = getPendingOnboarding();
    if (!payload) return;

    if (payload.suitePreference) {
      completeOnboardingSuiteSetup(payload.suitePreference);
    }

    const { data: memberships } = await settingsApi.getMemberships(undefined, userId);
    const membership = memberships && memberships.length > 0 ? memberships[0] : null;

    let targetOrgId = membership?.organization_id || null;

    if (!targetOrgId) {
      const bootstrapQuery = supabase.rpc(
        "bootstrap_organization" as never,
        {
          p_name: payload.storeName,
          p_business_type: payload.businessType,
          p_address: payload.storeAddress,
          p_phone: payload.storePhone,
          p_email: payload.storeEmail,
          p_gstin: payload.gstin,
          p_pan: payload.pan,
          p_tax_rate: payload.taxRate,
          p_invoice_prefix: payload.invoicePrefix || "INV",
          p_logo_url: logoUrl,
        } as never
      );

      const { data: bootstrapData, error: bootstrapError } = await bootstrapQuery
        .maybeSingle<{ organization_id: string }>();

      if (bootstrapData?.organization_id) {
        targetOrgId = bootstrapData.organization_id;
      } else if (bootstrapError && !isMissingBootstrapFunction(bootstrapError)) {
        throw new Error(bootstrapError.message || "Failed to create organization");
      }
    }

    if (!targetOrgId) {
      const { data: orgData, error: orgError } = await settingsApi.createOrganization({
        name: payload.storeName,
        business_type: payload.businessType,
        address: payload.storeAddress,
        phone: payload.storePhone,
        email: payload.storeEmail,
        gstin: payload.gstin,
        pan: payload.pan,
        tax_rate: payload.taxRate,
        invoice_prefix: payload.invoicePrefix || "INV",
        logo_url: logoUrl,
      });

      if (orgError || !orgData) {
        throw new Error(orgError?.message || "Failed to create organization");
      }

      targetOrgId = orgData.id;

      // Ensure membership is created in fallback path
      await settingsApi.upsertMembership(
        {
          organization_id: targetOrgId,
          user_id: userId,
          role: "store_owner",
        },
        targetOrgId
      );
    }

    await seedOrgProducts(targetOrgId, payload);
    clearPendingOnboarding();
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: fullName.trim(), phone: phone.trim() },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error || !data?.user) {
        toast({ title: "Signup failed", description: error?.message || "Unable to create account", variant: "destructive" });
        setLoading(false);
        return;
      }

      setPendingOnboarding(buildPendingOnboardingPayload());

      if (!data.session) {
        setLoading(false);
        setMode("login");
        setStep(1);
        toast({
          title: "Verify your email to continue",
          description: "Account created. Please verify your email, then sign in to finish store setup.",
        });
        return;
      }

      try {
        const logoUrl = await uploadLogo(data.user.id);
        completeOnboardingSuiteSetup(suitePreference);
        await completePendingOnboarding(data.user.id, logoUrl);
        await refreshOrganization();
        const targetRoute = suitePreference === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard;
        navigate(targetRoute);
      } catch (setupErr) {
        console.error("Onboarding setup failed:", setupErr);
        toast({
          title: "Store setup failed",
          description: setupErr instanceof Error ? setupErr.message : "Please sign in again to retry setup.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      console.error("Signup error:", err);
      toast({ title: "Signup failed", description: err?.message || "Unable to create account", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 3;

  return (
    <div className="min-h-[100dvh] bg-background gradient-hero flex items-start sm:items-center justify-center px-3 sm:px-4 py-8 sm:py-12 overflow-y-auto relative">
      {/* Ambient background glows */}
      <div aria-hidden className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-10 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center justify-center hover:opacity-95 transition-opacity">
            <CredSmartLogo size="xl" />
          </Link>
          <p className="text-xs sm:text-sm text-slate-600 mt-2.5 font-medium">
            All-in-One Completely Free Business Management Platform
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8 relative overflow-hidden">
          {/* Tabs — only show on step 1 */}
          {step === 1 && (
            <div className="flex gap-2 p-1.5 bg-slate-100/90 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setMode("login"); setStep(1); }}
                className={cn(
                  "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200",
                  mode === "login"
                    ? "bg-blue-700 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={cn(
                  "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200",
                  mode === "signup"
                    ? "bg-[#FF6A00] text-white shadow-md shadow-orange-500/20"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Start Free 🚀
              </button>
            </div>
          )}

          {/* Step indicator for signup */}
          {mode === "signup" && step > 1 && (
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      "h-1.5 rounded-full flex-1 transition-all",
                      s <= step ? "bg-accent" : "bg-muted"
                    )}
                  />
                </div>
              ))}
            </div>
          )}

          {/* LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetSent(false);
                    setForgotPasswordOpen(true);
                  }}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-md font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
              >
                {loading ? "Signing in..." : "Sign In to Workspace"} {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* SIGNUP STEP 1: Account */}
          {mode === "signup" && step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
              <p className="text-xs font-bold text-[#FF6A00] uppercase tracking-wider">Step 1 of {totalSteps} — Account Credentials</p>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required className={inputClass} />
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className={inputClass} />
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required className={inputClass} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" required minLength={6} className={inputClass} />
              </div>
              <button type="submit" className="w-full h-11 rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white shadow-md shadow-orange-500/20 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer">
                Continue to Store Setup <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SIGNUP STEP 2: Store Details */}
          {mode === "signup" && step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
              <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Account
              </button>
              <p className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">Step 2 of {totalSteps} — Store Setup</p>

              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Store / Business name" required className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Business Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {businessTypes.map((bt) => (
                    <button key={bt} type="button" onClick={() => setBusinessType(bt)}
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left",
                        businessType === bt
                          ? "bg-gold/15 border-gold text-foreground font-bold shadow-2xs"
                          : "border-border text-muted-foreground hover:bg-muted/70"
                      )}>
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Operational Hub / Suite Preference */}
              <OnboardingSuiteSelector
                value={suitePreference}
                onChange={setSuitePreference}
              />

              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <textarea value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Store address" required rows={2}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-sm resize-none font-sans" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="tel" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="Store phone" required className={inputClass} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} placeholder="Store email (optional)" className={inputClass} />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Store Logo (Optional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                {logoPreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
                    <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{logoFile?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{((logoFile?.size || 0) / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={removeLogo} className="text-destructive hover:opacity-80">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-border/80 text-muted-foreground hover:border-gold hover:text-foreground transition-all flex flex-col items-center gap-1.5 bg-muted/20">
                    <Upload className="w-5 h-5 text-gold" />
                    <span className="text-xs font-medium">Click to upload invoice logo</span>
                    <span className="text-[10px] text-muted-foreground font-mono">PNG, JPG up to 2MB</span>
                  </button>
                )}
              </div>

              {/* Website Product Import (Optional) */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Import Products from Website (Optional)
                </label>
                {scrapedProducts.length > 0 ? (
                  <div className="p-3 rounded-xl border border-accent/30 bg-accent/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-accent" />
                        <span className="text-xs font-medium text-foreground font-mono">{scrapedProducts.length} products queued for import</span>
                      </div>
                      <button type="button" onClick={() => setScrapedProducts([])} className="text-xs text-muted-foreground hover:text-foreground font-semibold">
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <WebsiteProductImport
                    compact
                    onImport={(products) => setScrapedProducts(products)}
                  />
                )}
              </div>

              <button type="submit" disabled={!businessType} className="w-full h-11 rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white shadow-md shadow-orange-500/20 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer">
                Continue to Invoicing <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SIGNUP STEP 3: Invoicing, Bank & UPI */}
          {mode === "signup" && step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Store Setup
              </button>
              <p className="text-xs font-bold text-[#FF6A00] uppercase tracking-wider">Step 3 of {totalSteps} — Invoicing, Bank &amp; UPI Setup</p>

              {/* GST & PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} placeholder="GSTIN (optional)" maxLength={15} className={cn(inputClass, "font-mono text-xs")} />
                </div>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} placeholder="PAN (optional)" maxLength={10} className={cn(inputClass, "font-mono text-xs")} />
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Landmark className="w-4 h-4 text-gold" />
                  <span className="text-xs font-bold text-foreground">Bank Account Details (for Invoices)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name (e.g. HDFC, SBI)" className={cn(inputClass, "text-xs")} />
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.trim())} placeholder="Account number" className={cn(inputClass, "font-mono text-xs")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="relative">
                    <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase().trim())} placeholder="IFSC Code (e.g. HDFC0001429)" maxLength={11} className={cn(inputClass, "font-mono text-xs uppercase")} />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Account holder name" className={cn(inputClass, "text-xs")} />
                  </div>
                </div>
              </div>

              {/* UPI ID for Dynamic QR */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">UPI ID for Instant QR Payment</span>
                </div>
                <div className="relative">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value.trim())} placeholder="UPI ID (e.g. storename@okaxis, 9876543210@paytm)" className={cn(inputClass, "font-mono text-xs")} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Tax Rate (%)</label>
                  <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min={0} max={100} step={0.5}
                    className="w-full h-11 px-4 rounded-xl glass-input text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Invoice Prefix</label>
                  <input type="text" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().replace(/[^0-9A-Z_-]/g, ''))} maxLength={6} placeholder="INV"
                    className="w-full h-11 px-4 rounded-xl glass-input text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 text-xs text-muted-foreground">
                💡 Bank &amp; UPI details are automatically rendered on printed invoices &amp; thermal POS receipts.
              </div>

              <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-md font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer">
                {loading ? "Initializing Store Infrastructure..." : "Launch My Store Free 🚀"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-md bg-card border border-gold/30 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <KeyRound className="w-5 h-5 text-accent" />
              <span>Reset Your Password</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
              Enter the email associated with your account, and we will send you a password reset link.
            </DialogDescription>
          </DialogHeader>

          {resetSent ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-2xl space-y-2 text-center border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold">Password reset link sent!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Please check your inbox at <span className="font-semibold font-mono">{resetEmail}</span> and follow the instructions.</p>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 py-2">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your account email"
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent/90 transition-all disabled:opacity-50 shadow-md shadow-accent/20"
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

