import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Camera, Upload, Check, Copy, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface MobileScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUploaded?: (file: File) => void;
}

export function MobileScanModal({ open, onOpenChange, onFileUploaded }: MobileScanModalProps) {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://app.credsmart.in";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success("Mobile link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onFileUploaded) {
        onFileUploaded(file);
      }
      onOpenChange(false);
      toast.success(`Loaded "${file.name}" for OCR Parsing`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center text-orange-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Add Purchases from Mobile</DialogTitle>
              <DialogDescription className="text-xs">
                Scan bills with your phone camera or upload a photo/PDF here
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* QR Code section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center border border-border">
            <div className="p-3 bg-white rounded-xl shadow-xs border mb-3">
              <QRCodeSVG value={currentUrl} size={150} level="M" />
            </div>
            <p className="text-xs font-semibold text-foreground">Scan QR with your Smartphone</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Instantly opens the mobile purchase scanner in your mobile browser.
            </p>
          </div>

          {/* Or Upload file directly on desktop */}
          <div className="p-3.5 rounded-xl border-2 border-dashed border-border hover:border-orange-400 dark:hover:border-orange-500 transition-colors bg-muted/30 text-center relative cursor-pointer">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center gap-1.5 py-2">
              <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                Or upload bill photo / PDF from this PC
              </p>
              <p className="text-[10px] text-muted-foreground">
                Supports JPG, PNG, WebP, PDF (Max 10MB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>AI OCR extracts vendor, tax breakdown, and items automatically.</span>
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 text-xs">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
