import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserCircle,
  Building2,
  Receipt,
  Printer,
  Users,
  AlarmClock,
  FileSpreadsheet,
  IndianRupee,
  Gift,
  HelpCircle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Share2,
  Copy,
  Download,
  Calendar,
  MessageSquare,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface SettingsNavSidebarProps {
  activeItem: "business" | "invoice" | "print" | "account" | "users" | "import_data";
}

export function SettingsNavSidebar({ activeItem }: SettingsNavSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { org } = useOrganization();

  // Modals state
  const [accountModal, setAccountModal] = useState(false);
  const [remindersModal, setRemindersModal] = useState(false);
  const [caReportsModal, setCaReportsModal] = useState(false);
  const [pricingModal, setPricingModal] = useState(false);
  const [referModal, setReferModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);

  const businessInitial = (org?.name || "Business Name").charAt(0).toUpperCase() || "B";
  const businessPhone = org?.phone || "";
  const businessName = org?.name || "Business Name";

  const handleNavClick = (id: string, url?: string) => {
    if (url) {
      navigate(url);
      return;
    }
    switch (id) {
      case "account":
        setAccountModal(true);
        break;
      case "reminders":
        setRemindersModal(true);
        break;
      case "ca_reports":
        setCaReportsModal(true);
        break;
      case "pricing":
        setPricingModal(true);
        break;
      case "refer":
        setReferModal(true);
        break;
      case "help":
        setHelpModal(true);
        break;
      default:
        break;
    }
  };

  const navItems = [
    {
      id: "account",
      label: "Account",
      icon: UserCircle,
      active: activeItem === "account",
      isModal: true,
    },
    {
      id: "business",
      label: "Manage Business",
      icon: Building2,
      active: activeItem === "business",
      url: ROUTE_PATHS.businessSettings,
    },
    {
      id: "invoice",
      label: "Invoice Settings",
      icon: Receipt,
      active: activeItem === "invoice",
      url: ROUTE_PATHS.invoiceSettings,
    },
    {
      id: "print",
      label: "Print Settings",
      icon: Printer,
      active: activeItem === "print",
      badge: "New",
      url: ROUTE_PATHS.printSettings,
    },
    {
      id: "import_data",
      label: "Import Data",
      icon: FileSpreadsheet,
      active: activeItem === "import_data" || location.pathname === ROUTE_PATHS.tallyImport,
      badge: "Tally",
      url: ROUTE_PATHS.tallyImport,
    },
    {
      id: "reminders",
      label: "Reminders",
      icon: AlarmClock,
      active: false,
      isModal: true,
    },
    {
      id: "ca_reports",
      label: "CA Reports Sharing",
      icon: FileSpreadsheet,
      active: false,
      isModal: true,
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: IndianRupee,
      active: false,
      isModal: true,
    },
    {
      id: "refer",
      label: "Refer & Earn",
      icon: Gift,
      active: false,
      isModal: true,
    },
    // Filter out hidden pages: pricing, refer & earn, help & support
    // (Preserved in code for future re-enablement)
  ].filter(
    (item) => !["pricing", "refer", "help"].includes(item.id)
  );

  return (
    <>
      {/* Mobile Top Navigation Ribbon (< lg) */}
      <div className="lg:hidden w-full bg-card rounded-xl border border-border/80 p-2.5 shadow-xs space-y-2 select-none">
        <div className="flex items-center justify-between gap-2">
          {/* Business Info & Avatar */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#EAB308] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {businessInitial}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs text-foreground truncate leading-tight">
                {businessName}
              </h3>
              {businessPhone && (
                <p className="text-[10px] text-muted-foreground truncate">{businessPhone}</p>
              )}
            </div>
          </div>

          {/* Quick Back to Dashboard */}
          <button
            onClick={() => navigate(ROUTE_PATHS.dashboard)}
            className="h-7 px-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Horizontal Scrolling Settings Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {navItems.map((item) => {
            const isActive = item.active;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.url)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 border",
                  isActive
                    ? "bg-[#6366F1] text-white border-[#6366F1] shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/70"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1 py-0.2 rounded",
                      isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Full Sidebar (>= lg) */}
      <aside className="hidden lg:flex w-full lg:w-64 shrink-0 bg-card rounded-2xl border border-border/80 p-4 shadow-sm flex-col justify-between select-none">
        <div className="space-y-4">
          {/* Business Profile Card */}
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-10 h-10 rounded-full bg-[#EAB308] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {businessInitial}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-foreground truncate leading-snug">
                {businessName}
              </h3>
              {businessPhone && (
                <p className="text-xs text-muted-foreground truncate">{businessPhone}</p>
              )}
            </div>
          </div>

          {/* Back to Dashboard Button */}
          <button
            onClick={() => navigate(ROUTE_PATHS.dashboard)}
            className="w-full h-10 px-4 rounded-xl bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>

          {/* Navigation Links List */}
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const isActive = item.active;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id, item.url)}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group text-left",
                    isActive
                      ? "bg-[#6366F1] text-white font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-105",
                        isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                        isActive
                          ? "bg-white text-[#6366F1]"
                          : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Metadata */}
        <div className="pt-6 border-t border-border/70 mt-6 space-y-2 text-center">
          <p className="text-[11px] text-muted-foreground font-medium">App Version : 9.17.3</p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              100% Secure
            </span>
            <span className="text-border">|</span>
            <span className="font-semibold text-slate-600 dark:text-slate-400">ISO Certified</span>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-xs font-extrabold text-foreground tracking-tight">
              CredSmart<span className="text-[#6366F1] font-bold">POS</span>
            </span>
            <span className="text-[10px] text-muted-foreground">by flobiz</span>
          </div>
        </div>
      </aside>

      {/* Account Info Modal */}
      <Dialog open={accountModal} onOpenChange={setAccountModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-[#6366F1]" />
              Account Overview
            </DialogTitle>
            <DialogDescription>Profile information & store ownership details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registered Name:</span>
                <span className="font-bold text-foreground">{businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Support Phone:</span>
                <span className="font-mono text-foreground">{businessPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registered Email:</span>
                <span className="font-mono text-foreground">{org?.email || "Not Provided"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subscription Plan:</span>
                <span className="font-bold text-emerald-600">Enterprise Pro (Active)</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminders Modal */}
      <Dialog open={remindersModal} onOpenChange={setRemindersModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlarmClock className="w-5 h-5 text-[#6366F1]" />
              Payment & Stock Reminders
            </DialogTitle>
            <DialogDescription>Automated SMS and WhatsApp alerts for customer payments</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
              <p className="font-semibold text-foreground">Active Reminder Triggers:</p>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Overdue Customer Credit Udhar</span>
                <span className="font-bold text-emerald-600">Every 3 Days (SMS + WhatsApp)</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Low Inventory Stock Alert</span>
                <span className="font-bold text-blue-600">Threshold &lt; 10 Units</span>
              </div>
            </div>
            <Button
              className="w-full text-xs h-9 rounded-xl font-semibold"
              onClick={() => {
                toast({ title: "Reminder preferences updated!" });
                setRemindersModal(false);
              }}
            >
              Save Reminder Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CA Reports Sharing Modal */}
      <Dialog open={caReportsModal} onOpenChange={setCaReportsModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#6366F1]" />
              Share CA &amp; Accountant Reports
            </DialogTitle>
            <DialogDescription>1-click GST filing exports (GSTR-1, GSTR-3B, Sales Register)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">GSTR-1 JSON &amp; Excel Package</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs rounded-lg gap-1"
                  onClick={() => toast({ title: "GSTR-1 Excel downloaded successfully!" })}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Monthly Sales &amp; Purchase Register</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs rounded-lg gap-1"
                  onClick={() => toast({ title: "Sales Register downloaded successfully!" })}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </div>
            </div>
            <Button
              className="w-full text-xs h-9 rounded-xl font-semibold gap-1.5"
              onClick={() => {
                toast({ title: "CA invite link copied to clipboard!" });
                setCaReportsModal(false);
              }}
            >
              <Share2 className="w-3.5 h-3.5" /> Share CA Direct Portal Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Modal */}
      <Dialog open={pricingModal} onOpenChange={setPricingModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-[#6366F1]" />
              Subscription &amp; Plans
            </DialogTitle>
            <DialogDescription>Manage your store plan and add-on licences</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">Enterprise Unlimited Plan</span>
                <Badge className="bg-[#6366F1] text-white">Active</Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                Includes unlimited invoices, e-way bills, multi-device POS, inventory barcodes, and WhatsApp reminders.
              </p>
              <p className="font-mono font-bold text-base text-foreground pt-1">
                ₹3,499 / year <span className="text-xs font-normal text-muted-foreground">(Renews Mar 2027)</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refer & Earn Modal */}
      <Dialog open={referModal} onOpenChange={setReferModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-rose-500" />
              Refer &amp; Earn ₹1,000 Cash
            </DialogTitle>
            <DialogDescription>Invite fellow business owners and earn instant reward cash</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-2 text-center">
              <p className="font-semibold text-foreground">Your Referral Code:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="px-4 py-2 bg-card border rounded-xl font-mono text-sm font-bold text-[#6366F1] tracking-wider">
                  CREDSMART-{businessPhone.slice(-4)}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl gap-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(`CREDSMART-${businessPhone.slice(-4)}`);
                    toast({ title: "Referral code copied!" });
                  }}
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help & Support Modal */}
      <Dialog open={helpModal} onOpenChange={setHelpModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#6366F1]" />
              Help &amp; Customer Support
            </DialogTitle>
            <DialogDescription>24x7 Priority Support via WhatsApp, Phone, and Email</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toll-Free Helpline:</span>
                <span className="font-mono font-bold text-foreground">+91 80 6902 9999</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Support Email:</span>
                <span className="font-mono text-foreground">support@credsmart.in</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">WhatsApp Desk:</span>
                <span className="font-bold text-emerald-600">+91 74092 00341</span>
              </div>
            </div>
            <Button
              className="w-full text-xs h-9 rounded-xl font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                window.open("https://wa.me/917409200341", "_blank");
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Start Instant WhatsApp Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
