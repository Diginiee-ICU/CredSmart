import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, CheckCircle2, Sliders, Receipt, Percent } from "lucide-react";
import { toast } from "sonner";

interface SalesSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export interface SalesSettingsData {
  invoicePrefix: string;
  quotationPrefix: string;
  challanPrefix: string;
  creditNotePrefix: string;
  defaultPaymentTerms: string;
  defaultTaxRate: number;
  autoRoundOff: boolean;
  showSignature: boolean;
  defaultNotes: string;
  defaultTerms: string;
  printSize: "80mm" | "58mm" | "a4";
}

const DEFAULT_SETTINGS: SalesSettingsData = {
  invoicePrefix: "INV-",
  quotationPrefix: "EST-",
  challanPrefix: "DC-",
  creditNotePrefix: "CN-",
  defaultPaymentTerms: "Due on Receipt",
  defaultTaxRate: 18,
  autoRoundOff: true,
  showSignature: true,
  defaultNotes: "Thank you for your business!",
  defaultTerms: "1. Goods once sold will not be taken back without original bill.\n2. Interest @ 18% p.a. will be charged on overdue payments.",
  printSize: "80mm",
};

export function SalesSettingsModal({ open, onOpenChange, orgId }: SalesSettingsModalProps) {
  const [settings, setSettings] = useState<SalesSettingsData>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!orgId) return;
    try {
      const saved = localStorage.getItem(`credsmart_sales_settings_${orgId}`);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch { /* empty */ }
  }, [orgId, open]);

  const handleSave = () => {
    try {
      localStorage.setItem(`credsmart_sales_settings_${orgId}`, JSON.stringify(settings));
      toast.success("Sales settings updated successfully");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Sales &amp; Invoicing Preferences</DialogTitle>
              <DialogDescription className="text-xs">
                Configure document prefixes, default GST tax rates, payment terms, and printing defaults.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3 text-sm">
          {/* Document Prefixes */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-3">
            <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-indigo-500" />
              Document Numbering Prefixes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Sales Invoice</Label>
                <Input
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  placeholder="INV-"
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Quotation / Est.</Label>
                <Input
                  value={settings.quotationPrefix}
                  onChange={(e) => setSettings({ ...settings, quotationPrefix: e.target.value })}
                  placeholder="EST-"
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Delivery Challan</Label>
                <Input
                  value={settings.challanPrefix}
                  onChange={(e) => setSettings({ ...settings, challanPrefix: e.target.value })}
                  placeholder="DC-"
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Credit Note</Label>
                <Input
                  value={settings.creditNotePrefix}
                  onChange={(e) => setSettings({ ...settings, creditNotePrefix: e.target.value })}
                  placeholder="CN-"
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Defaults & Tax */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-3">
            <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-500" />
              Defaults &amp; Calculations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Default Payment Terms</Label>
                <Select
                  value={settings.defaultPaymentTerms}
                  onValueChange={(val) => setSettings({ ...settings, defaultPaymentTerms: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    <SelectItem value="Net 7">Net 7 Days</SelectItem>
                    <SelectItem value="Net 15">Net 15 Days</SelectItem>
                    <SelectItem value="Net 30">Net 30 Days</SelectItem>
                    <SelectItem value="Net 45">Net 45 Days</SelectItem>
                    <SelectItem value="Net 60">Net 60 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Default GST Rate</Label>
                <Select
                  value={String(settings.defaultTaxRate)}
                  onValueChange={(val) => setSettings({ ...settings, defaultTaxRate: Number(val) })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exempted / Nil)</SelectItem>
                    <SelectItem value="5">5% GST</SelectItem>
                    <SelectItem value="12">12% GST</SelectItem>
                    <SelectItem value="18">18% GST (Standard)</SelectItem>
                    <SelectItem value="28">28% GST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Receipt / Print Format</Label>
                <Select
                  value={settings.printSize}
                  onValueChange={(val: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => setSettings({ ...settings, printSize: val })} // eslint-disable-line @typescript-eslint/no-explicit-any
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">Thermal 80mm (Standard)</SelectItem>
                    <SelectItem value="58mm">Thermal 58mm (Mini)</SelectItem>
                    <SelectItem value="a4">A4 Tax Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <div className="flex items-center justify-between flex-1 p-2.5 rounded-lg bg-background border border-border">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold cursor-pointer">Auto Round-off</Label>
                  <p className="text-[11px] text-muted-foreground">Round grand total to nearest ₹1.00</p>
                </div>
                <Switch
                  checked={settings.autoRoundOff}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoRoundOff: checked })}
                />
              </div>

              <div className="flex items-center justify-between flex-1 p-2.5 rounded-lg bg-background border border-border">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold cursor-pointer">Authorized Signature</Label>
                  <p className="text-[11px] text-muted-foreground">Print signature block on receipts</p>
                </div>
                <Switch
                  checked={settings.showSignature}
                  onCheckedChange={(checked) => setSettings({ ...settings, showSignature: checked })}
                />
              </div>
            </div>
          </div>

          {/* Default Terms & Notes */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-3">
            <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
              Terms &amp; Conditions and Footer
            </h3>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Default Terms &amp; Conditions</Label>
                <textarea
                  rows={3}
                  value={settings.defaultTerms}
                  onChange={(e) => setSettings({ ...settings, defaultTerms: e.target.value })}
                  className="w-full mt-1 p-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                />
              </div>
              <div>
                <Label className="text-xs">Invoice Footer Note</Label>
                <Input
                  value={settings.defaultNotes}
                  onChange={(e) => setSettings({ ...settings, defaultNotes: e.target.value })}
                  placeholder="Thank you for shopping with us!"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="w-4 h-4" />
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
