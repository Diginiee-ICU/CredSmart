import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard, Zap, Sparkles } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { group: "Global & Navigation", items: [
    { key: "⌘K / Ctrl+K", desc: "Open Global Search & Command Palette" },
    { key: "F1", desc: "Navigate to Dashboard" },
    { key: "F2", desc: "Parties / Customers" },
    { key: "F3", desc: "Items Catalog" },
    { key: "F4", desc: "Sales Multi-Document Hub" },
    { key: "F5", desc: "Purchases & Inward Goods" },
    { key: "F6", desc: "Reports" },
    { key: "F9", desc: "POS Billing & Instant Checkout" },
  ]},
  { group: "Sales & Invoicing", items: [
    { key: "Alt + N", desc: "Create New Sales Invoice / Document" },
    { key: "Ctrl + P", desc: "Print Receipt / Tax Invoice" },
    { key: "Ctrl + S", desc: "Save Document as Final" },
    { key: "Alt + Q", desc: "New Quotation / Estimate" },
    { key: "Alt + E", desc: "Export Current Table to CSV" },
    { key: "Esc", desc: "Close Active Modal / Dropdown" },
  ]},
  { group: "Item & Line Editing", items: [
    { key: "Enter", desc: "Add Line Item & Jump to Next Field" },
    { key: "Tab / Shift+Tab", desc: "Navigate between Input Fields" },
    { key: "Delete / Backspace", desc: "Remove selected row in cart" },
  ]},
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Keyboard Shortcuts</DialogTitle>
              <DialogDescription className="text-xs">
                Boost your billing &amp; accounting speed with keyboard accelerators
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {SHORTCUTS.map((grp, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/80">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {grp.group}
              </h4>
              <div className="space-y-2">
                {grp.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground">{item.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-semibold shadow-2xs text-foreground">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
