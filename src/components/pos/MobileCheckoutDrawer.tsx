import React from "react";
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Plus,
  Minus,
  Trash2,
  Printer,
  Check,
  Send,
  Building2,
  Phone,
  Coins,
} from "lucide-react";
import { BillingTab, POSCartItem } from "@/pages/POSBilling";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export interface MobileCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: BillingTab;
  updateCurrentTab: (updater: (tab: BillingTab) => BillingTab) => void;
  onRemoveItem: (index: number) => void;
  onOpenCustomerModal: () => void;
  grandTotal: number;
  subTotal: number;
  taxAmount: number;
  itemDiscountsTotal: number;
  billDiscountAmount: number;
  receivedNum: number;
  changeDue: number;
  onSaveBill: (shouldPrint?: boolean, shouldWhatsApp?: boolean) => Promise<void>;
  isProcessingSave: boolean;
  storeUpiId?: string;
  storeName?: string;
}

export const MobileCheckoutDrawer: React.FC<MobileCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  updateCurrentTab,
  onRemoveItem,
  onOpenCustomerModal,
  grandTotal,
  subTotal,
  taxAmount,
  itemDiscountsTotal,
  billDiscountAmount,
  receivedNum,
  changeDue,
  onSaveBill,
  isProcessingSave,
  storeUpiId = "",
  storeName = "CredSmart POS",
}) => {
  if (!isOpen) return null;

  const paymentModes = ["Cash", "UPI", "Card", "Credit", "Split"] as const;

  const quickCashAmounts = [
    { label: "Exact", value: Math.ceil(grandTotal) },
    { label: "₹100", value: 100 },
    { label: "₹200", value: 200 },
    { label: "₹500", value: 500 },
    { label: "₹2000", value: 2000 },
  ];

  const upiPayUri = storeUpiId
    ? `upi://pay?pa=${encodeURIComponent(storeUpiId)}&pn=${encodeURIComponent(
        storeName
      )}&am=${grandTotal.toFixed(2)}&cu=INR`
    : "";

  return (
    <div
      data-testid="mobile-checkout-drawer-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        data-testid="mobile-checkout-drawer"
        className="w-full max-h-[92dvh] bg-white dark:bg-slate-900 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Drag Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

        {/* Header */}
        <div className="px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Checkout & Pay
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {currentTab.items.length} line item(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="drawer-grand-total"
              className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums"
            >
              ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <button
              type="button"
              data-testid="close-checkout-drawer-btn"
              onClick={onClose}
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close checkout drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 overscroll-contain">
          {/* Customer Pod */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                  {currentTab.customer?.name || "Walk-in Customer"}
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                  {currentTab.customer?.phone || "No phone linked"}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="drawer-customer-select-btn"
              onClick={onOpenCustomerModal}
              className="h-7 px-2.5 rounded-md border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 active:scale-95 transition-all shrink-0 shadow-2xs"
            >
              {currentTab.customer ? "Change" : "+ Select"}
            </button>
          </div>

          {/* Cart Items Review Section */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cart Items ({currentTab.items.length})
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Qty / Price
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-44 overflow-y-auto">
              {currentTab.items.map((item, idx) => {
                const lineTotal = item.sp * item.quantity;
                return (
                  <div
                    key={item.id || idx}
                    data-testid={`drawer-cart-item-${idx}`}
                    className="p-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.product.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-slate-500">
                        <span>₹{item.sp.toFixed(2)} each</span>
                        <span>•</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Stepper + Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="h-6.5 flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentTab((tab) => {
                              if (item.quantity <= 1) {
                                return {
                                  ...tab,
                                  items: tab.items.filter((_, i) => i !== idx),
                                };
                              }
                              return {
                                ...tab,
                                items: tab.items.map((it, i) =>
                                  i === idx ? { ...it, quantity: it.quantity - 1 } : it
                                ),
                              };
                            });
                          }}
                          className="w-6 h-6.5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 text-[11px] font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentTab((tab) => ({
                              ...tab,
                              items: tab.items.map((it, i) =>
                                i === idx ? { ...it, quantity: it.quantity + 1 } : it
                              ),
                            }));
                          }}
                          className="w-6 h-6.5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Payment Method
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {paymentModes.map((mode) => {
                const isSelected = currentTab.paymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`payment-mode-${mode.toLowerCase()}`}
                    onClick={() =>
                      updateCurrentTab((tab) => ({ ...tab, paymentMode: mode }))
                    }
                    className={cn(
                      "h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border",
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* UPI QR Display if UPI selected */}
          {currentTab.paymentMode === "UPI" && (
            <div
              data-testid="upi-qr-card"
              className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center gap-2"
            >
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                {upiPayUri ? (
                  <QRCodeSVG value={upiPayUri} size={110} level="M" />
                ) : (
                  <QrCode className="w-20 h-20 text-slate-400" />
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                {storeUpiId ? (
                  <span>UPI ID: <strong className="text-slate-900 dark:text-white">{storeUpiId}</strong></span>
                ) : (
                  <span>Scan to pay ₹{grandTotal.toFixed(2)}</span>
                )}
              </div>
            </div>
          )}

          {/* Cash Received & Change Due if Cash selected */}
          {currentTab.paymentMode === "Cash" && (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Received Amount
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Change:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                    ₹{changeDue.toFixed(2)}
                  </strong>
                </span>
              </div>

              {/* Quick Cash Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {quickCashAmounts.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() =>
                      updateCurrentTab((tab) => ({
                        ...tab,
                        receivedAmount: String(q.value),
                      }))
                    }
                    className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 active:scale-95 transition-all shrink-0 shadow-2xs"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Input for custom received amount */}
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  data-testid="drawer-received-amount-input"
                  value={currentTab.receivedAmount}
                  onChange={(e) =>
                    updateCurrentTab((tab) => ({
                      ...tab,
                      receivedAmount: e.target.value,
                    }))
                  }
                  placeholder={String(Math.ceil(grandTotal))}
                  className="w-full h-8 pl-6 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Bill Breakdown Summary Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Items Subtotal</span>
              <span className="font-mono tabular-nums">₹{subTotal.toFixed(2)}</span>
            </div>

            {itemDiscountsTotal > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Item Discounts</span>
                <span className="font-mono tabular-nums">-₹{itemDiscountsTotal.toFixed(2)}</span>
              </div>
            )}

            {billDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Bill Discount</span>
                <span className="font-mono tabular-nums">-₹{billDiscountAmount.toFixed(2)}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Tax (GST)</span>
                <span className="font-mono tabular-nums">+₹{taxAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-1.5 flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span>Total Payable</span>
              <span
                data-testid="drawer-net-payable-amount"
                className="font-mono text-sm text-blue-600 dark:text-blue-400 tabular-nums"
              >
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2 select-none">
          {/* Save & Print CTA (Primary) */}
          <button
            type="button"
            data-testid="mobile-save-and-print-btn"
            disabled={isProcessingSave || currentTab.items.length === 0}
            onClick={() => onSaveBill(true, false)}
            className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex-1 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isProcessingSave ? "Processing..." : "Generate Bill & Print"}</span>
          </button>

          {/* Save Only CTA (Secondary) */}
          <button
            type="button"
            data-testid="mobile-save-only-btn"
            disabled={isProcessingSave || currentTab.items.length === 0}
            onClick={() => onSaveBill(false, false)}
            className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {/* WhatsApp CTA */}
          <button
            type="button"
            data-testid="mobile-whatsapp-btn"
            disabled={isProcessingSave || currentTab.items.length === 0}
            onClick={() => onSaveBill(false, true)}
            className="h-10 w-10 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 flex items-center justify-center active:scale-[0.98] transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save and dispatch WhatsApp receipt"
            aria-label="Save and dispatch WhatsApp receipt"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
