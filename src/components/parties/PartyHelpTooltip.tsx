import { useState } from "react";
import {
  HelpCircle,
  X,
  PlayCircle,
  FileQuestion,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PartyHelpTooltipProps {
  onOpenDetailedGuide?: () => void;
}

export function PartyHelpTooltip({ onOpenDetailedGuide }: PartyHelpTooltipProps) {
  const [showBanner, setShowBanner] = useState(true);
  const [showFaqModal, setShowFaqModal] = useState(false);

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-card border border-primary/30 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Need Help with Parties & SharedLedger?
                </h4>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Click on the help button to see tutorials and FAQs specific to the current screen.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setShowBanner(false);
                    setShowFaqModal(true);
                  }}
                  className="h-7 text-xs px-3"
                >
                  Got it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBanner(false)}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ & Walkthrough Dialog */}
      <Dialog open={showFaqModal} onOpenChange={setShowFaqModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-primary" />
              Parties Hub & SharedLedger Guide
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <Accordion type="single" collapsible defaultValue="faq-1" className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger className="text-xs font-bold text-foreground">
                  What is SharedLedger and how does it prevent ledger discrepancies?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  SharedLedger creates a direct digital bridge between you and your parties. When you record a Sales invoice in CredSmart, the invoice details can be shared via a secure magic link or auto-synced to the buyer's system as an inward purchase bill. This eliminates duplicate manual data entry and prevents end-of-month ledger mismatches.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger className="text-xs font-bold text-foreground">
                  How does GSTIN Fast Auto-Lookup work?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  When you enter a 15-character GST number (e.g., 27AAPFU0939F1ZV) and click "Verify & Autofill", CredSmart checks the GST database to auto-populate the Legal Business Name, Trade Name, Registered Address, State, PIN Code, and PAN number automatically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger className="text-xs font-bold text-foreground">
                  What is the difference between Customer, Supplier, and Both?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Customer:</strong> A party who buys goods/services from you (receivable / debit balance).<br />
                  <strong>Supplier:</strong> A vendor who sells goods/services to you (payable / credit balance).<br />
                  <strong>Both:</strong> A party with whom you engage in two-way trade (they sell raw materials and buy finished goods). CredSmart maintains a single consolidated net balance ledger.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4">
                <AccordionTrigger className="text-xs font-bold text-foreground">
                  How do I bulk import all my existing parties using Excel?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  Click the "Upload Excel" button at the bottom of the Parties page. You can download our sample CSV/Excel template, fill in your party details (Name, Phone, GSTIN, Opening Balance), and upload or paste the file to import hundreds of parties in seconds.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
