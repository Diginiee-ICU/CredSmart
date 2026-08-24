import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Sparkles,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Globe,
  Lock,
  RefreshCw,
} from "lucide-react";
import {
  GstApiConfig,
  getGstApiConfig,
  saveGstApiConfig,
  lookupGSTIN,
  GSTLookupResult,
} from "@/utils/gstinLookup";
import { toast } from "sonner";

interface GstApiConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GstApiConfigModal({ open, onOpenChange }: GstApiConfigModalProps) {
  const [config, setConfig] = useState<GstApiConfig>(getGstApiConfig());
  const [testGstin, setTestGstin] = useState("27AAPFU0939F1ZV");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<GSTLookupResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfig(getGstApiConfig());
      setTestResult(null);
      setTestError(null);
    }
  }, [open]);

  const handleSave = () => {
    saveGstApiConfig(config);
    toast.success("GST API configuration saved successfully!");
    onOpenChange(false);
  };

  const handleTestConnection = async () => {
    const clean = testGstin.trim().toUpperCase();
    if (!clean || clean.length !== 15) {
      toast.error("Enter a valid 15-character GSTIN to test.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    // Save temporary config for testing
    saveGstApiConfig(config);

    try {
      const result = await lookupGSTIN(clean, config.environment);
      setTestResult(result);
      if (result.legalName) {
        toast.success(`Connection verified! Found: ${result.legalName}`);
      } else {
        toast.info(`State: ${result.state} (Code ${result.stateCode}) & PAN extracted.`);
      }
    } catch (err: any) {
      setTestError(err?.message || "Failed to query GST API.");
      toast.error("GST API query failed.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                GST Verification API Gateway
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure your real-time GSTIN search and verification provider
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              GST API Provider *
            </Label>
            <Select
              value={config.provider}
              onValueChange={(val: any) => setConfig((prev) => ({ ...prev, provider: val }))}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="irp">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Government NIC IRP Sandbox / Production</span>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                      Pre-Configured
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="appyflow">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Appyflow GST API (Direct Key)</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">
                      Instant API
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="gstincheck">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">GSTINCheck / SheetRock API</span>
                    <Badge variant="outline" className="text-[10px]">
                      Key Based
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="mastergst">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">MasterGST GSP Gateway</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Provider Info Banner */}
          {config.provider === "irp" && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-950 dark:text-blue-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Government NIC e-Invoicing & Master GSTIN Gateway
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Connected with RSA-2048 Public Key Encryption, App Key AES Session Decryption, and Sandbox Token caching. Direct sandbox calls require official static IP whitelisting.
              </p>
            </div>
          )}

          {config.provider === "appyflow" && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
              <div className="font-bold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Appyflow Real-Time Taxpayer Search
                </div>
                <a
                  href="https://appyflow.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Direct REST endpoint for 100% live taxpayer details across all 38 Indian states & UTs.
              </p>
            </div>
          )}

          {config.provider === "gstincheck" && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  GSTINCheck API
                </div>
                <a
                  href="https://gstincheck.co.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  Get Free Test Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Provides instant JSON verification with trade name, registered address, and filing status.
              </p>
            </div>
          )}

          {/* API Key Input (if applicable) */}
          {config.provider !== "irp" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">API Key / Secret Token *</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Paste your GST API Key here..."
                  value={config.apiKey || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                  className="pl-9 h-10 font-mono text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Environment & Auto-lookup Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Gateway Environment</Label>
              <Select
                value={config.environment}
                onValueChange={(val: any) => setConfig((prev) => ({ ...prev, environment: val }))}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production (Live Filing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="text-xs font-bold text-foreground">Auto-Fetch on Typing</p>
                <p className="text-[10px] text-muted-foreground">Trigger lookup on 15 characters</p>
              </div>
              <Switch
                checked={config.autoLookupEnabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, autoLookupEnabled: checked }))
                }
              />
            </div>
          </div>

          {/* Live Test Section */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Test Live GST Lookup</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">15-char GSTIN</span>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="e.g. 27AAPFU0939F1ZV"
                value={testGstin}
                onChange={(e) => setTestGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15))}
                className="h-10 font-mono uppercase text-xs rounded-xl flex-1"
                maxLength={15}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || testGstin.length !== 15}
                className="h-10 px-4 rounded-xl gap-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-xs shrink-0"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Test Search
              </Button>
            </div>

            {testResult && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Response ({testResult.source})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground pt-1">
                  <div>
                    <span className="text-muted-foreground">Legal Name:</span>{" "}
                    <span className="font-semibold">{testResult.legalName || "Not listed (State facts loaded)"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">State:</span>{" "}
                    <span className="font-semibold">{testResult.state} ({testResult.stateCode})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PAN:</span>{" "}
                    <span className="font-mono font-semibold">{testResult.pan}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      {testResult.status}
                    </Badge>
                  </div>
                  {testResult.address && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Address:</span>{" "}
                      <span>{testResult.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {testError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{testError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-10 px-4">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="rounded-xl text-xs h-10 px-5 gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
