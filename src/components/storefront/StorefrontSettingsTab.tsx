import { useState, useEffect } from "react";
import { StorefrontSettings, STOREFRONT_PRESET_THEMES } from "@/types/storefront";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Store,
  Globe,
  Upload,
  Phone,
  MessageCircle,
  CreditCard,
  Truck,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StorefrontSettingsTabProps {
  settings: StorefrontSettings;
  onSave: (data: Partial<StorefrontSettings>) => Promise<boolean>;
  saving: boolean;
}

export function StorefrontSettingsTab({
  settings,
  onSave,
  saving,
}: StorefrontSettingsTabProps) {
  const [formData, setFormData] = useState<StorefrontSettings>(settings);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pos.credalert.bussiness";
  const storeUrl = `${baseUrl}/store/${formData.slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Store link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size exceeds 5MB limit.");
      return;
    }

    if (type === "logo") setUploadingLogo(true);
    else setUploadingBanner(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `storefront/${Date.now()}-${type}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("store-logos").getPublicUrl(path);

      if (type === "logo") {
        setFormData((prev) => ({ ...prev, logo_url: publicUrl }));
      } else {
        setFormData((prev) => ({ ...prev, banner_url: publicUrl }));
      }
      toast.success(`${type === "logo" ? "Store logo" : "Cover banner"} uploaded successfully!`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image.");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else setUploadingBanner(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug.trim()) {
      toast.error("Store handle/slug cannot be empty.");
      return;
    }
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
      {/* Top Banner Status & URL Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: formData.theme_color || "#FF6A00" }}
          >
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Storefront Online Status
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  formData.is_enabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {formData.is_enabled ? "🟢 LIVE" : "⚪ OFFLINE"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              When live, customers can access your catalogue and place orders on WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              {formData.is_enabled ? "Published" : "Hidden"}
            </span>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_enabled: checked }))
              }
            />
          </div>
        </div>
      </div>

      {/* Public Handle & URL */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Public Store Handle & Link</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            This forms your unique public storefront address to share with customers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-blue-600 focus-within:bg-white transition">
            <span className="px-3 text-xs font-mono text-slate-400 bg-slate-100/70 border-r border-slate-200 py-2.5 select-none">
              {baseUrl}/store/
            </span>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                }))
              }
              className="flex-1 px-3 py-2 text-xs font-mono font-semibold text-slate-900 bg-transparent focus:outline-hidden"
              placeholder="your-shop-name"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold border-slate-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </Button>

            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-10 px-3.5 rounded-xl text-xs font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                <span>Visit Store</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Store Identity & Branding */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col gap-4">
        <h4 className="text-sm font-bold text-slate-900">Store Profile & Branding</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Store Display Name *</Label>
            <Input
              value={formData.store_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, store_name: e.target.value }))}
              placeholder="e.g. Shree Krishna Supermarket"
              className="h-10 rounded-xl text-xs mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Tagline / Subtitle</Label>
            <Input
              value={formData.tagline || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="e.g. Fresh Groceries & Daily Staples Delivered in 30 Mins"
              className="h-10 rounded-xl text-xs mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700">About / Business Bio</Label>
          <Textarea
            rows={2}
            value={formData.description || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Tell customers about your products, quality assurance, and store history..."
            className="rounded-xl text-xs mt-1 resize-none"
          />
        </div>

        {/* Logo & Banner images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Logo */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Store Logo</span>
                <span className="text-[11px] text-slate-400 block">Square image (1:1)</span>
              </div>
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadImage(e, "logo")}
              />
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl shadow-2xs">
                <Upload className="w-3 h-3" />
                <span>{uploadingLogo ? "Uploading..." : "Change"}</span>
              </span>
            </label>
          </div>

          {/* Banner */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {formData.banner_url ? (
                  <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Cover Banner</span>
                <span className="text-[11px] text-slate-400 block">Header backdrop</span>
              </div>
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadImage(e, "banner")}
              />
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl shadow-2xs">
                <Upload className="w-3 h-3" />
                <span>{uploadingBanner ? "Uploading..." : "Change"}</span>
              </span>
            </label>
          </div>
        </div>

        {/* Theme Accent Presets */}
        <div className="pt-2">
          <Label className="text-xs font-semibold text-slate-700 block mb-2">
            Store Accent Color Theme
          </Label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {STOREFRONT_PRESET_THEMES.map((th) => {
              const isSelected = formData.theme_color?.toLowerCase() === th.hex.toLowerCase();
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, theme_color: th.hex }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 flex items-center justify-center"
                    style={{ backgroundColor: th.hex }}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </span>
                  <span>{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* WhatsApp & Contact Details */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col gap-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-600" />
          <span>Contact & WhatsApp Orders</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">
              WhatsApp Order Phone *
            </Label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-2.5 rounded-xl border border-slate-200">
                +91
              </span>
              <Input
                value={formData.whatsapp_number || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    whatsapp_number: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="10-digit mobile number"
                className="h-10 rounded-xl text-xs flex-1"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Customer orders will be routed directly to this WhatsApp number.
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Display Contact Phone</Label>
            <Input
              value={formData.contact_phone || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  contact_phone: e.target.value,
                }))
              }
              placeholder="e.g. 9876543210 or Landline"
              className="h-10 rounded-xl text-xs mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700">Store Address / Location</Label>
          <Input
            value={formData.address || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Shop No., Market / Area, City, Pincode"
            className="h-10 rounded-xl text-xs mt-1"
          />
        </div>
      </div>

      {/* Fulfillment, Minimums & UPI Payments */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col gap-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" />
          <span>Fulfillment & Payment Settings</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Home Delivery</span>
              <span className="text-[11px] text-slate-500 block">Accept orders for delivery</span>
            </div>
            <Switch
              checked={formData.enable_home_delivery !== false}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, enable_home_delivery: checked }))
              }
            />
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Store Pickup</span>
              <span className="text-[11px] text-slate-500 block">Allow counter pick-up</span>
            </div>
            <Switch
              checked={formData.enable_store_pickup !== false}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, enable_store_pickup: checked }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Minimum Order (₹)</Label>
            <Input
              type="number"
              min={0}
              value={formData.minimum_order_amount ?? 0}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  minimum_order_amount: Number(e.target.value) || 0,
                }))
              }
              className="h-10 rounded-xl text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Delivery Fee (₹)</Label>
            <Input
              type="number"
              min={0}
              value={formData.delivery_charges ?? 0}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  delivery_charges: Number(e.target.value) || 0,
                }))
              }
              className="h-10 rounded-xl text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">FREE Delivery Above (₹)</Label>
            <Input
              type="number"
              min={0}
              value={formData.free_delivery_above ?? 500}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  free_delivery_above: Number(e.target.value) || 0,
                }))
              }
              className="h-10 rounded-xl text-xs mt-1"
            />
          </div>
        </div>

        <div className="pt-1">
          <Label className="text-xs font-semibold text-slate-700">UPI ID for Direct QR Payments</Label>
          <Input
            value={formData.upi_id || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, upi_id: e.target.value }))}
            placeholder="e.g. storename@okaxis or mobile@upi"
            className="h-10 rounded-xl text-xs mt-1 font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Enables instant UPI QR payments on customer cart and printable counter standees.
          </p>
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700">Announcement Ticker Banner</Label>
          <Input
            value={formData.custom_announcement || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, custom_announcement: e.target.value }))
            }
            placeholder="e.g. Free delivery on orders above ₹499 • Delivery in 45 mins"
            className="h-10 rounded-xl text-xs mt-1"
          />
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg">
        <Button
          type="submit"
          disabled={saving}
          className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Changes..." : "Save Storefront Settings"}</span>
        </Button>
      </div>
    </form>
  );
}
