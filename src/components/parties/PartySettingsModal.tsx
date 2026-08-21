import { useState } from "react";
import {
  X,
  Settings,
  Sliders,
  Bell,
  CreditCard,
  CheckCircle2,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface PartySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PartySettingsModal({ isOpen, onClose }: PartySettingsModalProps) {
  const [defaultCreditLimit, setDefaultCreditLimit] = useState("25000");
  const [defaultCreditDays, setDefaultCreditDays] = useState("30");
  const [autoSmsReminders, setAutoSmsReminders] = useState(true);
  const [whatsappReminders, setWhatsappReminders] = useState(true);
  const [enforceCreditBlock, setEnforceCreditBlock] = useState(false);
  const [gstMandatoryForB2B, setGstMandatoryForB2B] = useState(true);

  if (!isOpen) return null;

  const handleSave = () => {
    toast.success("Party settings saved successfully!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Parties Configuration</h2>
              <p className="text-xs text-muted-foreground">
                Set default credit limits, overdue grace periods, and payment notifications
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Defaults */}
          <div className="space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Default Credit Terms
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Credit Limit (₹)</Label>
                <Input
                  value={defaultCreditLimit}
                  onChange={(e) => setDefaultCreditLimit(e.target.value)}
                  type="number"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Credit Days</Label>
                <Input
                  value={defaultCreditDays}
                  onChange={(e) => setDefaultCreditDays(e.target.value)}
                  type="number"
                />
              </div>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-4 pt-2 border-t border-border">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Automated Reminders & Rules
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="font-semibold text-foreground">WhatsApp Payment Reminders</p>
                <p className="text-[11px] text-muted-foreground">
                  Send automated payment reminder with UPI QR link 3 days before due date
                </p>
              </div>
              <Switch checked={whatsappReminders} onCheckedChange={setWhatsappReminders} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="font-semibold text-foreground">SMS Payment Reminders</p>
                <p className="text-[11px] text-muted-foreground">
                  Dispatch DLT-compliant SMS notifications for invoices and receipts
                </p>
              </div>
              <Switch checked={autoSmsReminders} onCheckedChange={setAutoSmsReminders} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="font-semibold text-foreground">Strict Credit Limit Enforcement</p>
                <p className="text-[11px] text-muted-foreground">
                  Block POS checkout if customer balance exceeds approved credit limit
                </p>
              </div>
              <Switch checked={enforceCreditBlock} onCheckedChange={setEnforceCreditBlock} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="font-semibold text-foreground">Mandatory GSTIN for B2B Parties</p>
                <p className="text-[11px] text-muted-foreground">
                  Require valid 15-character GSTIN when creating Wholesaler / Distributor parties
                </p>
              </div>
              <Switch checked={gstMandatoryForB2B} onCheckedChange={setGstMandatoryForB2B} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
