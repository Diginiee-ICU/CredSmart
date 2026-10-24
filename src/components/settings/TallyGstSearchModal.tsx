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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  FileCheck,
  Search,
  ArrowRight,
} from "lucide-react";
import { GSTLookupResult, isValidGSTIN } from "@/utils/gstinLookup";
import { parseTallyGstResult } from "@/utils/tallyGstParser";
import { toast } from "sonner";

interface TallyGstSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGstin?: string;
  onApply: (result: GSTLookupResult) => void;
}

export function TallyGstSearchModal({
  open,
  onOpenChange,
  initialGstin = "",
  onApply,
}: TallyGstSearchModalProps) {
  const [gstinInput, setGstinInput] = useState(initialGstin);
  const [rawText, setRawText] = useState("");
  const [parsedResult, setParsedResult] = useState<GSTLookupResult | null>(null);

  useEffect(() => {
    if (open) {
      setGstinInput(initialGstin);
      if (initialGstin) {
        handleParse(initialGstin);
      }
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialGstin]);

  const handleOpenTally = () => {
    const url = "https://tallysolutions.com/business-tools-templates/gstin-verification-search/?srsltid=AfmBOore0HCWKpS2v1zy5T1pDJQyQl82BNf37QeJNH2gOnEe-08ThOR6";
    window.open(url, "_blank", "noopener,noreferrer,width=1000,height=750");
    toast.info("Opened Tally GSTIN search. Search GSTIN, copy results, and paste below!");
  };

  const handleParse = (textToParse: string) => {
    if (!textToParse.trim()) return;
    const result = parseTallyGstResult(textToParse, gstinInput);
    if (result.legalName || result.pan || result.address) {
      setParsedResult(result);
      if (result.legalName) {
        toast.success(`Captured: ${result.legalName}`);
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        handleParse(text);
        toast.success("Pasted from clipboard & parsed!");
      }
    } catch {
      toast.error("Could not read clipboard. Please paste manually into the box.");
    }
  };

  const handleApply = () => {
    if (parsedResult) {
      onApply(parsedResult);
      toast.success(`Auto-filled details for ${parsedResult.legalName || "GSTIN"}!`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl p-6">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#FCB316]/15 text-[#D97706] dark:text-[#FBBF24]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Tally GSTIN Verification &amp; Smart Capture
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Search on Tally Solutions, capture official business details &amp; auto-fill into CredSmart
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono">
              Tally Bridge
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Step 1: Launch Tally Search */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center">1</span>
                Step 1: Search GSTIN on Official Tally Tool
              </span>
              <Button
                type="button"
                onClick={handleOpenTally}
                className="h-8 text-xs gap-1.5 bg-[#FCB316] hover:bg-[#E5A110] text-black font-bold rounded-lg px-3 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Launch Tally Search Tool
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Click the button above to launch Tally's official GST verification engine. Search any GSTIN, copy the result card or text, and bring it back here.
            </p>
          </div>

          {/* Step 2: Instant Paste & Capture Zone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center">2</span>
                Step 2: Paste Tally Result (or JSON)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePasteFromClipboard}
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 rounded-lg px-2.5"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste from Clipboard
              </Button>
            </div>
            <Textarea
              placeholder="Paste copied text or details from Tally tool here (e.g. Legal Name: ITC LIMITED, Address: ...)"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                handleParse(e.target.value);
              }}
              rows={3}
              className="font-mono text-xs rounded-xl border-border bg-card resize-none"
            />
          </div>

          {/* Step 3: Parsed Output Preview */}
          {parsedResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Captured Business Details</span>
                </div>
                <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  {parsedResult.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-background/80 p-3 rounded-lg border border-emerald-500/20">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Legal Name:</span>
                  <span className="font-bold text-foreground">{parsedResult.legalName || "—"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Trade Name:</span>
                  <span className="font-semibold text-foreground">{parsedResult.tradeName || parsedResult.legalName || "—"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">State &amp; State Code:</span>
                  <span className="font-semibold text-foreground">{parsedResult.state} ({parsedResult.stateCode})</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">PAN &amp; Category:</span>
                  <span className="font-mono font-semibold text-foreground">{parsedResult.pan} • {parsedResult.category}</span>
                </div>
                {parsedResult.address && (
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-muted-foreground block">Principal Place of Business:</span>
                    <span className="text-foreground leading-relaxed">{parsedResult.address}</span>
                  </div>
                )}
                {parsedResult.pincode && (
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Postal PIN Code:</span>
                    <span className="font-mono font-semibold text-foreground">{parsedResult.pincode}</span>
                  </div>
                )}
                {parsedResult.city && (
                  <div>
                    <span className="text-[11px] text-muted-foreground block">City:</span>
                    <span className="font-semibold text-foreground">{parsedResult.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-10 px-4">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!parsedResult}
            className="rounded-xl text-xs h-10 px-5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            Auto-Fill into Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
