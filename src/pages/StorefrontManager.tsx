import { useState } from "react";
import { useStorefront } from "@/hooks/useStorefront";
import { StorefrontSettingsTab } from "@/components/storefront/StorefrontSettingsTab";
import { StorefrontCatalogTab } from "@/components/storefront/StorefrontCatalogTab";
import { StorefrontOrdersTab } from "@/components/storefront/StorefrontOrdersTab";
import { StorefrontMarketingTab } from "@/components/storefront/StorefrontMarketingTab";
import { StorefrontMobilePreview } from "@/components/storefront/StorefrontMobilePreview";
import { StorefrontStandeeModal } from "@/components/storefront/StorefrontStandeeModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Store,
  Settings,
  Package,
  ShoppingBag,
  Share2,
  Printer,
  Smartphone,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function StorefrontManager() {
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);

  const {
    settings,
    orders,
    loading,
    saving,
    ordersLoading,
    updateSettings,
    updateOrderStatus,
    refreshOrders,
  } = useStorefront();

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6A00] animate-bounce">
            <Store className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Loading Digital Storefront...
          </p>
        </div>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pos.credalert.bussiness";
  const storeUrl = `${baseUrl}/store/${settings.slug}`;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="flex-1 w-full pb-16 px-4 sm:px-8 pt-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6A00] border border-orange-200 flex items-center justify-center shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Digital Catalogue & Storefront
                </h1>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    settings.is_enabled
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {settings.is_enabled ? "LIVE ONLINE" : "OFFLINE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Share your live product catalog with customers, take WhatsApp orders, and print counter QR standees.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsStandeeModalOpen(true)}
            className="h-10 rounded-xl text-xs font-semibold border-slate-200 shadow-2xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Counter Standee</span>
          </Button>

          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button
              size="sm"
              className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Live Store ↗</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 flex flex-col gap-6">
        <TabsList className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 w-full sm:w-auto self-start flex overflow-x-auto no-scrollbar">
          <TabsTrigger
            value="settings"
            className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Store Profile & Setup</span>
          </TabsTrigger>

          <TabsTrigger
            value="catalog"
            className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Product Catalog</span>
          </TabsTrigger>

          <TabsTrigger
            value="orders"
            className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders & Inquiries</span>
            {pendingOrdersCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingOrdersCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="marketing"
            className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>QR Standee & Share</span>
          </TabsTrigger>

          <TabsTrigger
            value="preview"
            className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-2xs hidden lg:flex"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Simulator</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Settings */}
        <TabsContent value="settings" className="m-0">
          <StorefrontSettingsTab
            settings={settings}
            onSave={updateSettings}
            saving={saving}
          />
        </TabsContent>

        {/* Tab 2: Catalog Management */}
        <TabsContent value="catalog" className="m-0">
          <StorefrontCatalogTab themeColor={settings.theme_color} />
        </TabsContent>

        {/* Tab 3: Orders */}
        <TabsContent value="orders" className="m-0">
          <StorefrontOrdersTab
            orders={orders}
            ordersLoading={ordersLoading}
            onUpdateStatus={updateOrderStatus}
            onRefresh={refreshOrders}
          />
        </TabsContent>

        {/* Tab 4: Marketing Kit */}
        <TabsContent value="marketing" className="m-0">
          <StorefrontMarketingTab
            store={settings}
            onOpenStandeeModal={() => setIsStandeeModalOpen(true)}
          />
        </TabsContent>

        {/* Tab 5: Mobile Simulator */}
        <TabsContent value="preview" className="m-0 flex justify-center py-4">
          <StorefrontMobilePreview store={settings} />
        </TabsContent>
      </Tabs>

      {/* Standee Print Modal */}
      <StorefrontStandeeModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        store={settings}
      />
    </div>
  );
}
