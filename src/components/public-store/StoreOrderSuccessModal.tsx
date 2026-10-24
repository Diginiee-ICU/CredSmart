import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, ShoppingBag } from "lucide-react";

interface StoreOrderSuccessModalProps {
  orderInfo: { orderNumber: string; whatsappUrl: string } | null;
  onClose: () => void;
  storeName: string;
}

export function StoreOrderSuccessModal({
  orderInfo,
  onClose,
  storeName,
}: StoreOrderSuccessModalProps) {
  if (!orderInfo) return null;

  return (
    <Dialog open={!!orderInfo} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-6 text-center rounded-2xl bg-white border-slate-200">
        <DialogHeader className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Order Dispatched!
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Order #{orderInfo.orderNumber} has been recorded and sent to {storeName}.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 rounded-2xl p-4 my-2 text-xs text-slate-600 border border-slate-200/80">
          <p className="leading-relaxed">
            Your order details were forwarded to WhatsApp. The store owner will confirm availability and delivery shortly.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <a
            href={orderInfo.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>Reopen WhatsApp Order Chat</span>
            </Button>
          </a>

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-10 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            <span>Continue Browsing</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
