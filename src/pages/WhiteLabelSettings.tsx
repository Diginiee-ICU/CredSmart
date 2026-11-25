import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  KeyRound,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Trash2,
  Palette,
  Globe,
  Image as ImageIcon,
  ShieldCheck,
  Copy,
  Eye,
  Monitor,
  FileText,
  LogIn,
  Save,
  RotateCcw,
  Lock,
  ExternalLink,
} from "lucide-react";
import { SettingsNavSidebar } from "@/components/settings/SettingsNavSidebar";
import { useWhiteLabel } from "@/context/WhiteLabelContext";
import { useOrganization } from "@/hooks/useOrganization";
import {
  DEFAULT_BRAND_CONFIG,
  uploadWhiteLabelAsset,
  type WhiteLabelConfig,
} from "@/services/whiteLabelApi";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StudioTab = "identity" | "assets" | "theme" | "domain";
type PreviewMode = "app" | "login" | "invoice";

const COLOR_PRESETS = [
  { name: "Royal Blue", primary: "#2563EB", secondary: "#F97316" },
  { name: "Emerald Retail", primary: "#059669", secondary: "#0EA5E9" },
  { name: "Indigo SaaS", primary: "#4F46E5", secondary: "#EC4899" },
  { name: "Crimson Corp", primary: "#DC2626", secondary: "#F59E0B" },
  { name: "Teal Modern", primary: "#0D9488", secondary: "#F59E0B" },
  { name: "Slate Obsidian", primary: "#1E293B", secondary: "#3B82F6" },
];

interface AssetUploaderProps {
  label: string;
  hint: string;
  value: string;
  darkPreview?: boolean;
  onChange: (url: string) => void;
}

function AssetUploadCard({ label, hint, value, darkPreview = false, onChange }: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Asset file must be under 4MB.");
      return;
    }
    setUploading(true);
    const res = await uploadWhiteLabelAsset(file);
    setUploading(false);
    if (res.error || !res.url) {
      toast.error(res.error || "Upload failed");
    } else {
      onChange(res.url);
      toast.success(`${label} uploaded`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">{label}</p>
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-7 px-2 rounded-md text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/gif"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "w-16 h-16 rounded-lg border border-dashed flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-colors",
            darkPreview
              ? "bg-slate-900 border-slate-700 hover:border-slate-500"
              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-blue-500"
          )}
        >
          {value ? (
            <img src={value} alt={label} className="max-w-full max-h-full object-contain p-1" />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3 h-3" />
            <span>{uploading ? "Uploading..." : value ? "Replace Image" : "Upload Image"}</span>
          </button>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste https://... image URL"
            className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

export default function WhiteLabelSettings() {
  const navigate = useNavigate();
  const { org } = useOrganization();
  const {
    request,
    config,
    isActivated,
    isEnabled,
    loading,
    submitRequest,
    activateWithKey,
    saveConfig,
    toggleEnabled,
  } = useWhiteLabel();

  // Request Form State
  const [reqBrandName, setReqBrandName] = useState(org?.name || "");
  const [reqDomain, setReqDomain] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);

  // Key Entry State
  const [licenseKey, setLicenseKey] = useState("");
  const [activatingKey, setActivatingKey] = useState(false);

  // Studio Tabs & Draft Form State
  const [studioTab, setStudioTab] = useState<StudioTab>("identity");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("app");
  const [savingStudio, setSavingStudio] = useState(false);
  const [draft, setDraft] = useState<Partial<WhiteLabelConfig>>({
    brand_name: DEFAULT_BRAND_CONFIG.brand_name,
    brand_tagline: DEFAULT_BRAND_CONFIG.brand_tagline,
    powered_by_text: "",
    hide_platform_branding: true,
    logo_light_url: "",
    logo_dark_url: "",
    favicon_url: "",
    splash_logo_url: "",
    primary_color: "#2563EB",
    secondary_color: "#F97316",
    sidebar_theme: "dark",
    brand_slug: "",
    custom_domain: "",
    support_email: "",
    support_phone: "",
    website_url: "",
    meta_title: "",
    meta_description: "",
    custom_footer_text: "",
    is_enabled: true,
  });

  useEffect(() => {
    if (org?.name && !reqBrandName) {
      setReqBrandName(org.name);
    }
  }, [org?.name, reqBrandName]);

  useEffect(() => {
    if (config) {
      setDraft({
        brand_name: config.brand_name || org?.name || "My Brand",
        brand_tagline: config.brand_tagline || "",
        powered_by_text: config.powered_by_text || "",
        hide_platform_branding: config.hide_platform_branding !== false,
        logo_light_url: config.logo_light_url || "",
        logo_dark_url: config.logo_dark_url || "",
        favicon_url: config.favicon_url || "",
        splash_logo_url: config.splash_logo_url || "",
        primary_color: config.primary_color || "#2563EB",
        secondary_color: config.secondary_color || "#F97316",
        sidebar_theme: config.sidebar_theme || "dark",
        brand_slug: config.brand_slug || "",
        custom_domain: config.custom_domain || "",
        support_email: config.support_email || "",
        support_phone: config.support_phone || "",
        website_url: config.website_url || "",
        meta_title: config.meta_title || "",
        meta_description: config.meta_description || "",
        custom_footer_text: config.custom_footer_text || "",
        is_enabled: config.is_enabled !== false,
      });
    }
  }, [config, org?.name]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqBrandName.trim()) {
      toast.error("Please enter your desired Brand Name.");
      return;
    }
    setSubmittingReq(true);
    const res = await submitRequest({
      requested_brand_name: reqBrandName.trim(),
      requested_domain: reqDomain.trim(),
      notes: reqNotes.trim(),
    });
    setSubmittingReq(false);
    if (res.success) {
      toast.success("White-Label request submitted! Your admin will review and provide an activation key.");
    } else {
      toast.error(res.error || "Could not submit request.");
    }
  };

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = licenseKey.trim().toUpperCase();
    if (!cleaned) {
      toast.error("Please enter the activation key provided by your Admin.");
      return;
    }
    setActivatingKey(true);
    const res = await activateWithKey(cleaned);
    setActivatingKey(false);
    if (res.success) {
      toast.success(res.message || "White-Label Branding Studio unlocked!");
      setLicenseKey("");
    } else {
      toast.error(res.error || "Invalid activation key.");
    }
  };

  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.brand_name?.trim()) {
      toast.error("Brand Name is required.");
      return;
    }
    setSavingStudio(true);
    const res = await saveConfig(draft);
    setSavingStudio(false);
    if (res.success) {
      toast.success("Custom branding saved and applied across app & site!");
    } else {
      toast.error(res.error || "Failed to save branding settings.");
    }
  };

  const handleToggleLive = async () => {
    const next = !isEnabled;
    const res = await toggleEnabled(next);
    if (res.success) {
      setDraft((d) => ({ ...d, is_enabled: next }));
      toast.success(next ? "White-Label branding enabled live" : "White-Label branding paused (reverted to default)");
    } else {
      toast.error(res.error || "Could not toggle branding state");
    }
  };

  const handleResetColors = () => {
    setDraft((d) => ({
      ...d,
      primary_color: "#2563EB",
      secondary_color: "#F97316",
      sidebar_theme: "dark",
    }));
  };

  const brandShareUrl =
    typeof window !== "undefined" && draft.brand_slug
      ? `${window.location.origin}/auth?brand=${draft.brand_slug}`
      : "";

  const previewPrimary = /^#[0-9A-Fa-f]{6}$/.test(draft.primary_color || "")
    ? (draft.primary_color as string)
    : "#2563EB";
  const previewSecondary = /^#[0-9A-Fa-f]{6}$/.test(draft.secondary_color || "")
    ? (draft.secondary_color as string)
    : "#F97316";

  const showReRequestForm = !request || request.status === "rejected" || request.status === "revoked";

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden max-w-[1550px] mx-auto w-full font-sans">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch overflow-hidden">
        {/* Left Navigation Sidebar */}
        <div className="shrink-0 lg:w-56 overflow-y-auto">
          <SettingsNavSidebar activeItem="white_label" />
        </div>

        {/* Main Workspace Card */}
        <main className="flex-1 min-h-0 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col overflow-hidden">
          {/* Header Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  White-Label Branding
                </h1>
                {isActivated ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border",
                      isEnabled
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isEnabled ? "ACTIVE" : "PAUSED"}</span>
                  </span>
                ) : request?.status === "approved" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                    <KeyRound className="w-3 h-3" />
                    <span>KEY REQUIRED</span>
                  </span>
                ) : request?.status === "pending" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>PENDING APPROVAL</span>
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Rebrand the entire app, login portal, invoices &amp; domain with your own identity
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isActivated && (
                <button
                  type="button"
                  onClick={handleToggleLive}
                  className={cn(
                    "h-8.5 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer active:scale-[0.98]",
                    isEnabled
                      ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                      : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                  )}
                >
                  {isEnabled ? "Pause White-Label" : "Enable White-Label"}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(ROUTE_PATHS.dashboard)}
                className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Bounded Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto pt-4 pr-0.5">
            {loading && !isActivated && !request ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                Checking white-label license status...
              </div>
            ) : !isActivated ? (
              /* ── GATED LIFECYCLE: REQUEST -> PENDING -> ENTER KEY ───────────────── */
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Step Progress Stepper */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { step: "1", title: "Request Access", active: showReRequestForm, done: Boolean(request && !showReRequestForm) },
                    { step: "2", title: "Admin Approval & Key", active: request?.status === "pending", done: request?.status === "approved" },
                    { step: "3", title: "Enter Key & Brand", active: request?.status === "approved", done: isActivated },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-center gap-2",
                        s.done
                          ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                          : s.active
                          ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-400"
                      )}
                    >
                      <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 border border-current flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                        {s.done ? "✓" : s.step}
                      </span>
                      <span className="truncate">{s.title}</span>
                    </div>
                  ))}
                </div>

                {/* Rejected / Revoked Notice */}
                {(request?.status === "rejected" || request?.status === "revoked") && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-rose-800 dark:text-rose-200 uppercase font-mono">
                        Previous Request {request.status}
                      </p>
                      {request.admin_notes && (
                        <p className="text-rose-700 dark:text-rose-300">Admin Note: {request.admin_notes}</p>
                      )}
                      <p className="text-rose-600 dark:text-rose-400">
                        You can submit an updated request below.
                      </p>
                    </div>
                  </div>
                )}

                {/* State A: Submit Request */}
                {showReRequestForm && (
                  <form
                    onSubmit={handleSubmitRequest}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Request Custom White-Label Access
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Submit your brand details. Once approved by the Platform Admin, you will receive an activation key to unlock full custom branding.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Desired Brand Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={reqBrandName}
                          onChange={(e) => setReqBrandName(e.target.value)}
                          placeholder="e.g. Apex Billing POS"
                          className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Preferred Custom Domain (Optional)
                        </label>
                        <input
                          type="text"
                          value={reqDomain}
                          onChange={(e) => setReqDomain(e.target.value)}
                          placeholder="e.g. pos.apexretail.in"
                          className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Business Notes / Justification
                      </label>
                      <textarea
                        rows={3}
                        value={reqNotes}
                        onChange={(e) => setReqNotes(e.target.value)}
                        placeholder="Describe how your organization plans to brand the web app & customer portals..."
                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <button
                        type="submit"
                        disabled={submittingReq}
                        className="h-8.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {submittingReq ? "Submitting..." : "Submit White-Label Request"}
                      </button>
                    </div>
                  </form>
                )}

                {/* State B: Pending Approval */}
                {request?.status === "pending" && (
                  <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Awaiting Admin Approval
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Your request for <span className="font-semibold">{request.requested_brand_name}</span> is in the review queue.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Requested Brand:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{request.requested_brand_name}</span>
                      </div>
                      {request.requested_domain && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Target Domain:</span>
                          <span className="font-mono text-slate-900 dark:text-white">{request.requested_domain}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Submitted On:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {new Date(request.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Once your Platform Admin approves and shares your license key, you can enter it here.</span>
                    </p>
                  </div>
                )}

                {/* State C: Approved -> Enter Key Provided by Admin */}
                {request?.status === "approved" && (
                  <form
                    onSubmit={handleActivateKey}
                    className="p-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Approved — Enter Your Activation Key
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          Your request for <span className="font-semibold">{request.requested_brand_name}</span> has been approved. Enter the key provided by your Admin below to unlock custom branding.
                        </p>
                      </div>
                    </div>

                    {request.admin_notes && (
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">Admin Note:</span> {request.admin_notes}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        White-Label Activation Key
                      </label>
                      <input
                        type="text"
                        required
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                        placeholder="CSWL-XXXX-XXXX-XXXX"
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tracking-widest uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={activatingKey}
                        className="h-8.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{activatingKey ? "Verifying..." : "Verify Key & Unlock Branding Studio"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* ── UNLOCKED BRANDING STUDIO + STICKY PREVIEW ──────────────────────── */
              <form onSubmit={handleSaveStudio} className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                {/* Left Column: Controls */}
                <div className="xl:col-span-7 space-y-4">
                  {/* Studio Sub-Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    {[
                      { id: "identity" as const, label: "Identity & Brand", icon: Sparkles },
                      { id: "assets" as const, label: "Logos & Icons", icon: ImageIcon },
                      { id: "theme" as const, label: "Colors & Theme", icon: Palette },
                      { id: "domain" as const, label: "Domain & SEO", icon: Globe },
                    ].map((tab) => {
                      const active = studioTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStudioTab(tab.id)}
                          className={cn(
                            "h-7.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                            active
                              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <tab.icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab: Identity */}
                  {studioTab === "identity" && (
                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Brand Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={draft.brand_name || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, brand_name: e.target.value }))}
                            placeholder="e.g. Apex Retail POS"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Brand Tagline
                          </label>
                          <input
                            type="text"
                            value={draft.brand_tagline || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, brand_tagline: e.target.value }))}
                            placeholder="e.g. Smart Billing & ERP Suite"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Powered By Label (Optional)
                          </label>
                          <input
                            type="text"
                            value={draft.powered_by_text || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, powered_by_text: e.target.value }))}
                            placeholder="e.g. Apex Technologies (or leave blank)"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Custom Footer Copyright
                          </label>
                          <input
                            type="text"
                            value={draft.custom_footer_text || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, custom_footer_text: e.target.value }))}
                            placeholder="e.g. © 2026 Apex Technologies Pvt Ltd"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Support Email
                          </label>
                          <input
                            type="email"
                            value={draft.support_email || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, support_email: e.target.value }))}
                            placeholder="support@yourbrand.com"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Support Phone
                          </label>
                          <input
                            type="text"
                            value={draft.support_phone || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, support_phone: e.target.value }))}
                            placeholder="+91 98765 43210"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            Remove CredSmart / CredAlert Branding Completely
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Replaces default headers, footers, splash loaders, CRM &amp; invoice watermarks
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={draft.hide_platform_branding !== false}
                          onChange={(e) => setDraft((d) => ({ ...d, hide_platform_branding: e.target.checked }))}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  )}

                  {/* Tab: Logos & Icons */}
                  {studioTab === "assets" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <AssetUploadCard
                        label="Primary Logo (Light Theme)"
                        hint="Transparent PNG or SVG for headers & auth"
                        value={draft.logo_light_url || ""}
                        onChange={(url) => setDraft((d) => ({ ...d, logo_light_url: url }))}
                      />
                      <AssetUploadCard
                        label="Inverse Logo (Dark Footer)"
                        hint="Light/white logo for dark backgrounds"
                        value={draft.logo_dark_url || ""}
                        darkPreview
                        onChange={(url) => setDraft((d) => ({ ...d, logo_dark_url: url }))}
                      />
                      <AssetUploadCard
                        label="App Icon / Browser Favicon"
                        hint="Square 1:1 PNG/ICO (e.g. 180x180)"
                        value={draft.favicon_url || ""}
                        onChange={(url) => setDraft((d) => ({ ...d, favicon_url: url }))}
                      />
                      <AssetUploadCard
                        label="App Splash Loader Graphic"
                        hint="Shown briefly while app routes boot"
                        value={draft.splash_logo_url || ""}
                        onChange={(url) => setDraft((d) => ({ ...d, splash_logo_url: url }))}
                      />
                    </div>
                  )}

                  {/* Tab: Colors & Theme */}
                  {studioTab === "theme" && (
                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Quick Palette Presets
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  primary_color: preset.primary,
                                  secondary_color: preset.secondary,
                                }))
                              }
                              className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
                            >
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: preset.primary }}
                              />
                              <span>{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Primary Brand Accent
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={previewPrimary}
                              onChange={(e) => setDraft((d) => ({ ...d, primary_color: e.target.value.toUpperCase() }))}
                              className="w-9 h-8.5 rounded border border-slate-200 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={draft.primary_color || "#2563EB"}
                              onChange={(e) => setDraft((d) => ({ ...d, primary_color: e.target.value.toUpperCase() }))}
                              className="flex-1 h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Secondary Highlight Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={previewSecondary}
                              onChange={(e) => setDraft((d) => ({ ...d, secondary_color: e.target.value.toUpperCase() }))}
                              className="w-9 h-8.5 rounded border border-slate-200 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={draft.secondary_color || "#F97316"}
                              onChange={(e) => setDraft((d) => ({ ...d, secondary_color: e.target.value.toUpperCase() }))}
                              className="flex-1 h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sidebar Surface:</span>
                          <select
                            value={draft.sidebar_theme || "dark"}
                            onChange={(e) => setDraft((d) => ({ ...d, sidebar_theme: e.target.value as "dark" | "light" }))}
                            className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          >
                            <option value="dark">Dark Slate</option>
                            <option value="light">Clean White</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetColors}
                          className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Colors</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab: Domain, Brand Link & SEO */}
                  {studioTab === "domain" && (
                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Branded Portal Slug
                          </label>
                          <input
                            type="text"
                            value={draft.brand_slug || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                brand_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                              }))
                            }
                            placeholder="e.g. apex-pos"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Custom Domain (CNAME)
                          </label>
                          <input
                            type="text"
                            value={draft.custom_domain || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, custom_domain: e.target.value.toLowerCase().trim() }))}
                            placeholder="e.g. pos.yourcompany.com"
                            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {brandShareUrl && (
                        <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                              Shareable White-Label Login Link
                            </p>
                            <p className="text-[11px] font-mono text-blue-700 dark:text-blue-400 truncate">
                              {brandShareUrl}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(brandShareUrl);
                              toast.success("Branded login URL copied!");
                            }}
                            className="h-7 px-2.5 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Browser Tab Title (SEO Meta Title)
                        </label>
                        <input
                          type="text"
                          value={draft.meta_title || ""}
                          onChange={(e) => setDraft((d) => ({ ...d, meta_title: e.target.value }))}
                          placeholder={`${draft.brand_name || "Your Brand"} — GST Billing & POS`}
                          className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Meta Description
                        </label>
                        <textarea
                          rows={2}
                          value={draft.meta_description || ""}
                          onChange={(e) => setDraft((d) => ({ ...d, meta_description: e.target.value }))}
                          placeholder="Custom description for browser links & search previews..."
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 font-mono">
                        DNS Tip: Point custom domain CNAME record to your Ubuntu server host and route HTTP/HTTPS traffic to the frontend app.
                      </div>
                    </div>
                  )}

                  {/* Save Bar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={savingStudio}
                      className="h-8.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingStudio ? "Applying..." : "Save & Apply Branding"}</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Live Interactive Preview */}
                <div className="xl:col-span-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Live Brand Preview</span>
                    </span>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      {[
                        { id: "app" as const, label: "App", icon: Monitor },
                        { id: "login" as const, label: "Login", icon: LogIn },
                        { id: "invoice" as const, label: "Invoice", icon: FileText },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPreviewMode(m.id)}
                          className={cn(
                            "h-6 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 cursor-pointer",
                            previewMode === m.id
                              ? "bg-slate-900 text-white dark:bg-slate-700"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <m.icon className="w-3 h-3" />
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview Canvas */}
                  {previewMode === "app" && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                      {/* Simulated Top Bar */}
                      <div className="h-10 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {draft.favicon_url || draft.logo_light_url ? (
                            <img
                              src={draft.favicon_url || draft.logo_light_url}
                              alt="Preview Icon"
                              className="w-6 h-6 rounded object-contain border border-slate-200 p-0.5 bg-white"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-bold"
                              style={{ backgroundColor: previewPrimary }}
                            >
                              {(draft.brand_name || "B").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {draft.brand_name || "Your Brand"}
                          </span>
                        </div>
                        <span
                          className="h-5 px-2 rounded text-[10px] font-semibold text-white flex items-center"
                          style={{ backgroundColor: previewPrimary }}
                        >
                          + New Bill
                        </span>
                      </div>

                      <div className="p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            POS Workspace
                          </span>
                          <span
                            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${previewSecondary}18`,
                              color: previewSecondary,
                            }}
                          >
                            {draft.brand_tagline || "POS & Invoicing"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                            <p className="text-[10px] text-slate-400">Today Sales</p>
                            <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">₹24,850.00</p>
                          </div>
                          <div className="p-2 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                            <p className="text-[10px] text-slate-400">Invoices</p>
                            <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">18 Bills</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>256-Bit SSL Encrypted</span>
                          <span>
                            {draft.powered_by_text
                              ? `by ${draft.powered_by_text}`
                              : draft.brand_name || "Your Brand"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewMode === "login" && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center space-y-3 shadow-xs">
                      <div className="flex flex-col items-center gap-1.5">
                        {draft.logo_light_url ? (
                          <img
                            src={draft.logo_light_url}
                            alt="Brand Logo"
                            className="h-9 max-w-[160px] object-contain"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: previewPrimary }}
                          >
                            {(draft.brand_name || "B").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {draft.brand_name || "Your Brand"}
                        </p>
                        {draft.brand_tagline && (
                          <p className="text-[11px] font-mono text-slate-500">{draft.brand_tagline}</p>
                        )}
                      </div>

                      <div className="space-y-2 text-left">
                        <div className="h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 flex items-center text-[11px] text-slate-400">
                          user@company.com
                        </div>
                        <div
                          className="h-7.5 rounded-md text-white text-xs font-semibold flex items-center justify-center"
                          style={{ backgroundColor: previewPrimary }}
                        >
                          Sign In to {draft.brand_name || "Portal"}
                        </div>
                      </div>

                      {draft.support_email && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          Help: {draft.support_email}
                        </p>
                      )}
                    </div>
                  )}

                  {previewMode === "invoice" && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white p-4 text-slate-900 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <p className="text-xs font-bold">{org?.name || "Retail Store"}</p>
                          <p className="text-[10px] text-slate-500">Tax Invoice #INV-1042</p>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: previewPrimary }}
                        >
                          PAID
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Wireless Barcode Scanner x 1</span>
                          <span className="font-mono font-semibold text-slate-800">₹2,499.00</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
                        {draft.hide_platform_branding
                          ? draft.powered_by_text
                            ? `Powered by ${draft.powered_by_text}`
                            : `Generated by ${draft.brand_name || "Retail System"}`
                          : "Powered by CredSmart ERP"}
                      </div>
                    </div>
                  )}

                  {brandShareUrl && (
                    <a
                      href={brandShareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Branded Login Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
