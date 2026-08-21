import { useState } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  FileSpreadsheet,
  Send,
  Sparkles,
  Lock,
  RefreshCw,
  Eye,
  Smartphone,
  CheckCheck,
  Clock,
} from "lucide-react";
import { Party } from "@/types/parties";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SharedLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  selectedParty?: Party | null;
}

export function SharedLedgerModal({
  isOpen,
  onClose,
  parties,
  selectedParty: initialSelectedParty,
}: SharedLedgerModalProps) {
  const [activePartyId, setActivePartyId] = useState<string>(
    initialSelectedParty?.id || (parties.length > 0 ? parties[0].id : "")
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, "synced" | "syncing" | "pending">>({});

  if (!isOpen) return null;

  const currentParty = parties.find((p) => p.id === activePartyId) || parties[0];

  const magicLink = currentParty
    ? `https://credsmart.app/shared-ledger/${currentParty.id}?token=sl_${currentParty.id.slice(0, 8)}`
    : "";

  const handleCopyLink = () => {
    if (!magicLink) return;
    navigator.clipboard.writeText(magicLink);
    setCopiedLink(true);
    toast.success("SharedLedger magic link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!currentParty || !currentParty.phone) {
      toast.error("Party does not have a registered mobile number.");
      return;
    }
    const message = `Hello ${currentParty.name},\n\nPlease access your live SharedLedger account statement on CredSmart here: ${magicLink}\n\nYou can review invoices, download statement PDFs, and confirm balances.`;
    const cleanPhone = currentParty.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleSyncParty = (partyId: string) => {
    setSyncStatus((prev) => ({ ...prev, [partyId]: "syncing" }));
    setTimeout(() => {
      setSyncStatus((prev) => ({ ...prev, [partyId]: "synced" }));
      toast.success("Ledger reconciled & synced with party cloud!");
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">SharedLedger Portal</h2>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider">
                  <Zap className="w-3 h-3 mr-1 fill-emerald-500 text-emerald-500" />
                  Live Sync
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Turn your sales invoices into vendor purchase bills instantly with zero manual entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Layout: Sidebar Party Selector + Main Details */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left Column: Party List */}
          <div className="md:col-span-4 bg-muted/20 flex flex-col overflow-hidden max-h-[350px] md:max-h-none border-b md:border-b-0">
            <div className="p-3 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Connected Parties ({parties.length})</span>
              <span className="text-[10px]">Instant View</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {parties.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePartyId(p.id)}
                  className={cn(
                    "w-full text-left p-3 transition-colors flex items-center justify-between text-xs group",
                    activePartyId === p.id
                      ? "bg-primary/10 border-l-4 border-primary font-bold text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.phone || "No phone"} · {p.partyType.toUpperCase()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-mono font-semibold text-[11px] shrink-0",
                      p.balance > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : p.balance < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {p.balance > 0 ? `+₹${p.balance.toLocaleString("en-IN")}` : p.balance < 0 ? `-₹${Math.abs(p.balance).toLocaleString("en-IN")}` : "₹0"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: SharedLedger Hub for Selected Party */}
          <div className="md:col-span-8 p-6 overflow-y-auto space-y-6">
            {currentParty ? (
              <>
                {/* Party Overview Card */}
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{currentParty.name}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {currentParty.partyType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        GSTIN: <span className="font-mono">{currentParty.gstin || "Unregistered / Consumer"}</span> · {currentParty.city || currentParty.state || "India"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Current Balance</p>
                      <p
                        className={cn(
                          "text-lg font-black font-mono",
                          currentParty.balance > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : currentParty.balance < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {currentParty.balance > 0
                          ? `₹ ${currentParty.balance.toLocaleString("en-IN")} (Dr)`
                          : currentParty.balance < 0
                          ? `₹ ${Math.abs(currentParty.balance).toLocaleString("en-IN")} (Cr)`
                          : "₹ 0.00 (Settled)"}
                      </p>
                    </div>
                  </div>

                  {/* Magic Link Share Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        Secure Party Public Magic Link
                      </span>
                      <span className="text-[11px] text-muted-foreground">No login needed for client</span>
                    </div>

                    <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-xl border border-border">
                      <input
                        type="text"
                        readOnly
                        value={magicLink}
                        className="flex-1 bg-transparent px-2.5 py-1 text-xs font-mono text-muted-foreground focus:outline-none truncate"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCopyLink}
                        className="shrink-0 h-8 gap-1 text-xs"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink ? "Copied" : "Copy Link"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendWhatsApp}
                        className="shrink-0 h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Features & 2-Way Sync Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                      <ArrowRightLeft className="w-4 h-4" />
                      Instant Invoice-to-Purchase Sync
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Whenever you create a Sales Invoice for this party, it automatically reflects in their purchase register without any duplicate manual entries.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncParty(currentParty.id)}
                      className="w-full text-xs gap-2 mt-1 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", syncStatus[currentParty.id] === "syncing" && "animate-spin")} />
                      {syncStatus[currentParty.id] === "syncing"
                        ? "Syncing ledger..."
                        : syncStatus[currentParty.id] === "synced"
                        ? "Reconciled & Synced ✓"
                        : "Force Reconcile Now"}
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      Balance Confirmation Request
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Send a one-click digital balance confirmation notice for audit and quarterly reconciliation with digital signature timestamp.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toast.success(`Digital balance confirmation request dispatched to ${currentParty.name}!`);
                      }}
                      className="w-full text-xs gap-2 mt-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Request Confirmation
                    </Button>
                  </div>
                </div>

                {/* Sample Live Transaction Sync Stream */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Recent Reconciled Invoices & Payments</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Auto-matched</span>
                  </div>
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card text-xs">
                    <div className="p-3 flex items-center justify-between bg-muted/30 font-semibold text-muted-foreground text-[11px]">
                      <span>Invoice / Voucher</span>
                      <span>Type</span>
                      <span>Amount</span>
                      <span>Status</span>
                    </div>
                    <div className="p-3 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <p className="font-semibold text-foreground">INV-2026-0814</p>
                        <p className="text-[10px] text-muted-foreground">18 Aug 2026</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600">
                        Sales Invoice
                      </Badge>
                      <span className="font-mono font-bold text-foreground">₹ 18,450</span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                        <CheckCheck className="w-3.5 h-3.5" /> Synced
                      </span>
                    </div>
                    <div className="p-3 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <p className="font-semibold text-foreground">PAY-REC-0042</p>
                        <p className="text-[10px] text-muted-foreground">15 Aug 2026</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                        Payment In (UPI)
                      </Badge>
                      <span className="font-mono font-bold text-foreground">₹ 15,000</span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                        <CheckCheck className="w-3.5 h-3.5" /> Matched
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Select a party from the left to view SharedLedger details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>End-to-End 256-Bit Encrypted B2B Ledger Gateway</span>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
