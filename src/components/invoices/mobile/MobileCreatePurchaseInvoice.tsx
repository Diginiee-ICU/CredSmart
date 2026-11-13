import React, { useState } from "react";
import { ArrowLeft, FileText, ScanBarcode, ChevronDown, User, X, ChevronUp, Plus, Eye, Trash2, Calendar, CreditCard, Check, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SelectPartyModal } from "./SelectPartyModal";
import { AddItemModal } from "./AddItemModal";
import { EditItemModal } from "./EditItemModal";
import { MobileBillPreviewModal } from "./MobileBillPreviewModal";
import { DocumentLineItem } from "@/types/documents";

export interface MobileCreatePurchaseInvoiceProps {
  onClose: () => void;
  docType: string;
  docDate: string;
  dueDate: string;
  showDueDate: boolean;
  invoicePrefix: string;
  invoiceNumberSeq: string;
  selectedSupplierId: string;
  partyName: string;
  suppliers: any[];
  items: DocumentLineItem[];
  recalculatedItems: DocumentLineItem[];
  totals: any;
  catalog: any[];
  defaultTaxType?: "exclusive" | "inclusive";
  saving?: boolean;
  onToggleDefaultTaxType?: (val: "exclusive" | "inclusive") => void;
  onSetSelectedSupplierId: (id: string, supplierData?: any) => void;
  onUpdateItem: (indexOrId: number | string, field: keyof DocumentLineItem, value: any) => void;
  onUpdateItemFields?: (indexOrId: number | string, fields: Partial<DocumentLineItem>) => void;
  onRemoveItem: (indexOrId: number | string) => void;
  onSave: (andPrint: boolean, saveAndNew: boolean) => void;
  onAddSelectedItems: (items: DocumentLineItem[]) => void;
  onUpdateAdditionalCharges?: (amount: number, reason: string) => void;
  onUpdateDiscount?: (type: "flat" | "percent", value: number) => void;
  onUpdateOverallDiscount?: (type: "flat" | "percent", value: number) => void;
  onUpdateRoundOff?: (auto: boolean, manualValue: number) => void;
  onUpdateNotes?: (notes: string) => void;
  amountReceived?: number;
  markAsFullyPaid?: boolean;
  onUpdatePayment?: (amountReceived: number, markAsFullyPaid: boolean, paymentMethod?: string) => void;
  onUpdateDocDetails?: (details: {
    invoicePrefix?: string;
    invoiceNumberSeq?: string;
    docDate?: string;
    dueDate?: string;
    showDueDate?: boolean;
  }) => void;
  onSupplierCreated?: (supplier: any) => void;
  storeInfo?: any;
  partyPhone?: string;
  partyGstin?: string;
  partyAddress?: string;
  placeOfSupply?: string;
  paymentMethod?: string;
  notes?: string;
  terms?: string;
  ewayBillNo?: string;
  vehicleNumber?: string;
  poReference?: string;
}

export function MobileCreatePurchaseInvoice(props: MobileCreatePurchaseInvoiceProps) {
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Metadata Edit Modal
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [editPrefix, setEditPrefix] = useState(props.invoicePrefix || "");
  const [editSeq, setEditSeq] = useState(props.invoiceNumberSeq || "");
  const [editDocDate, setEditDocDate] = useState(props.docDate || new Date().toISOString().slice(0, 10));
  const [editDueDate, setEditDueDate] = useState(props.dueDate || new Date().toISOString().slice(0, 10));
  const [editShowDueDate, setEditShowDueDate] = useState(Boolean(props.showDueDate));
  
  // Modals state for totals
  const [isChargesModalOpen, setIsChargesModalOpen] = useState(false);
  const [chargesReason, setChargesReason] = useState("");
  const [chargesAmount, setChargesAmount] = useState("");
  
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState("");
  
  const [isRoundOffModalOpen, setIsRoundOffModalOpen] = useState(false);
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState("");
  
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState(props.notes || "");
  const [isBillPreviewOpen, setIsBillPreviewOpen] = useState(false);

  // Payment Details Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>(String(props.amountReceived ?? ""));
  const [isFullyPaid, setIsFullyPaid] = useState<boolean>(Boolean(props.markAsFullyPaid));
  const [localPaymentMethod, setLocalPaymentMethod] = useState<string>(props.paymentMethod || "Bank Transfer");
  
  const handleSaveAndNew = () => {
    props.onSave(false, true);
  };
  
  const handleGenerateBill = () => {
    props.onSave(true, false);
  };

  // Format Date logic
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Due date logic (7 days to due etc.)
  const renderDueStatus = () => {
    if (!props.showDueDate) return null;
    const diffTime = new Date(props.dueDate).getTime() - new Date(props.docDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return <span className="text-slate-500 text-xs">- {diffDays >= 0 ? `${diffDays} day(s) to due` : `${Math.abs(diffDays)} day(s) overdue`}</span>;
  };

  // Filter valid populated items
  const populatedItems = (props.recalculatedItems || []).filter(
    (i) => i.productName && i.productName.trim() !== ""
  );

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-slate-50 overflow-y-auto pb-36 lg:hidden">
      {/* 3.1 Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={props.onClose} 
            className="p-1 text-indigo-700 hover:bg-slate-100 rounded-md cursor-pointer transition-colors active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-semibold text-slate-900">Create Bill / Invoice</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBillPreviewOpen(true)}
            className="flex items-center gap-1 text-[12px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2.5 py-1 active:scale-95 transition-all cursor-pointer"
            title="Preview Bill"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBillPreviewOpen(true)}
            className="p-1 text-indigo-700 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors active:scale-95"
            title="Bill Document Preview"
            aria-label="Bill Document Preview"
          >
            <FileText className="w-5 h-5 text-indigo-700" />
          </button>
          <button
            type="button"
            onClick={() => setIsItemModalOpen(true)}
            className="p-1 text-orange-500 hover:bg-orange-50 rounded-md cursor-pointer transition-colors active:scale-95"
            title="Scan & Add Items"
            aria-label="Scan & Add Items"
          >
            <ScanBarcode className="w-5 h-5 text-orange-500" />
          </button>
        </div>
      </div>

      {/* 3.2 Invoice Metadata Card */}
      <div className="flex justify-between items-center px-4 py-4 bg-white border-b border-slate-100">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-medium text-indigo-700">
            Purchase Invoice #{props.invoiceNumberSeq || "1"}
          </span>
          <div className="flex items-center gap-1 text-[13px]">
            <span className="text-slate-800 font-medium">{formatDate(props.docDate)}</span>
            {renderDueStatus()}
          </div>
        </div>
        <button 
          type="button"
          onClick={() => {
            setEditPrefix(props.invoicePrefix || "");
            setEditSeq(props.invoiceNumberSeq || "");
            setEditDocDate(props.docDate || new Date().toISOString().slice(0, 10));
            setEditDueDate(props.dueDate || new Date().toISOString().slice(0, 10));
            setEditShowDueDate(Boolean(props.showDueDate));
            setIsMetadataModalOpen(true);
          }}
          className="text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-3xl px-6 py-1.5 uppercase bg-white cursor-pointer active:scale-95 transition-all"
        >
          Edit
        </button>
      </div>

      {/* 3.4 Party Selection */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <label className="text-[11px] font-bold text-slate-600 mb-2 block tracking-wider uppercase">
          PARTY NAME <span className="text-rose-500">*</span>
        </label>
        <button 
          type="button"
          onClick={() => setIsPartyModalOpen(true)}
          className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-white w-full shadow-xs outline-none hover:border-indigo-400 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <User className="w-[18px] h-[18px] text-slate-400 shrink-0" />
            <div className="flex flex-col truncate">
              <span className={props.partyName ? "text-slate-900 font-medium text-[15px] truncate" : "text-slate-400 text-[15px]"}>
                {props.partyName || "Search/Create Supplier"}
              </span>
              {props.partyPhone && (
                <span className="text-xs text-slate-400 font-mono">Phone: {props.partyPhone}</span>
              )}
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* 3.6 Items Section */}
      <div className="bg-white">
        {populatedItems.length === 0 ? (
          <>
            <div className="px-4 pt-4 pb-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ChevronUp className="w-4 h-4 text-slate-500" /> ITEMS
            </div>
            <div className="px-4 pb-4">
              <button 
                type="button"
                onClick={() => setIsItemModalOpen(true)}
                className="w-full bg-indigo-50 hover:bg-indigo-100 border-none text-indigo-700 py-3.5 rounded-lg font-bold text-sm flex justify-center items-center cursor-pointer active:scale-98 transition-all"
              >
                Add Items
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col bg-white border-b border-slate-100">
              <div className="flex justify-between items-center px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                  ITEMS ({populatedItems.length})
                </div>
                <button 
                  type="button"
                  onClick={() => setIsItemModalOpen(true)} 
                  className="text-[14px] font-bold text-indigo-700 flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Plus className="w-4 h-4" /> Item
                </button>
              </div>

              {props.onToggleDefaultTaxType && (
                <div className="flex items-center justify-between px-4 pb-2.5 pt-1">
                  <span className="text-xs font-semibold text-slate-500">Purchase Rates:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => props.onToggleDefaultTaxType!("exclusive")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                        (props.defaultTaxType || "exclusive") === "exclusive"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Without Tax
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onToggleDefaultTaxType!("inclusive")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                        props.defaultTaxType === "inclusive"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      With Tax (GST)
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {populatedItems.map((item, idx) => {
              const matchedIndex = (props.items || []).findIndex((it) => it.id === item.id);
              const targetRowKey = item.id || (matchedIndex >= 0 ? matchedIndex : idx);

              return (
                <div key={item.id || idx} className="flex justify-between items-start px-4 py-4 border-b border-slate-100 bg-white">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="text-[15px] font-bold text-slate-900 truncate">
                        {item.productName || "Unnamed Item"}
                      </span>
                    </div>

                    {item.hsn && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        HSN: {item.hsn}
                      </span>
                    )}

                    <div className="flex flex-col gap-1 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium tracking-wide">Qty x Cost</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 overflow-hidden shadow-2xs">
                          <button 
                            type="button"
                            onClick={() => props.onUpdateItem(targetRowKey, 'quantity', Math.max(1, (Number(item.quantity) || 1) - 1))} 
                            className="px-2.5 py-1 text-slate-600 active:bg-slate-200 font-bold leading-none cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-[13px] font-bold text-slate-800 px-2 min-w-[1.5rem] text-center font-mono">
                            {item.quantity}
                          </span>
                          <button 
                            type="button"
                            onClick={() => props.onUpdateItem(targetRowKey, 'quantity', (Number(item.quantity) || 1) + 1)} 
                            className="px-2.5 py-1 text-slate-600 active:bg-slate-200 font-bold leading-none cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[12px] text-slate-600 font-medium font-mono">
                          {item.unit || "Pcs"} × ₹{Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 mt-1 shrink-0">
                    <span className="text-[15px] font-bold text-slate-900 font-mono">
                      ₹ {Number(item.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => {
                          const realIdx = (props.recalculatedItems || []).findIndex(it => it.id === item.id);
                          setEditingItemId(item.id);
                          setEditingItemIndex(realIdx >= 0 ? realIdx : idx);
                        }}
                        className="border border-indigo-200 bg-white hover:bg-indigo-50 rounded-3xl px-3.5 py-1 text-[10px] font-bold text-indigo-600 uppercase cursor-pointer active:scale-95 transition-all"
                      >
                        EDIT
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onRemoveItem(targetRowKey)}
                        className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Item"
                        aria-label="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="flex justify-between items-center px-4 pt-6 pb-2 bg-white">
              <span className="text-[15px] font-bold text-slate-800">Item Subtotal</span>
              <span className="text-[17px] font-bold text-slate-900 font-mono">
                ₹ {Number(props.totals?.rawSubtotal || props.totals?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col items-end px-4 py-4 gap-3 bg-white pb-6 border-b border-slate-100">
              {(props.totals?.additionalCharges || 0) > 0 ? (
                <div className="flex justify-between items-center w-full">
                  <button 
                    type="button"
                    onClick={() => {
                      setChargesAmount(String(props.totals.additionalCharges));
                      setIsChargesModalOpen(true);
                    }} 
                    className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer text-left"
                  >
                    Additional Charges
                  </button>
                  <span className="text-[15px] font-bold text-slate-900 font-mono">
                    ₹ {Number(props.totals.additionalCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsChargesModalOpen(true)} 
                  className="text-[14px] font-bold text-indigo-700 tracking-wide cursor-pointer hover:underline"
                >
                  + Additional Charges
                </button>
              )}

              {(props.totals?.totalDiscount || props.totals?.discountTotal || 0) > 0 ? (
                <div className="flex justify-between items-center w-full">
                  <button 
                    type="button"
                    onClick={() => setIsDiscountModalOpen(true)} 
                    className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer text-left"
                  >
                    Discount
                  </button>
                  <span className="text-[15px] font-bold text-emerald-600 font-mono">
                    - ₹ {Number(props.totals.totalDiscount || props.totals.discountTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)} 
                  className="text-[14px] font-bold text-indigo-700 tracking-wide cursor-pointer hover:underline"
                >
                  + Discount
                </button>
              )}

              {(props.totals?.taxTotal || 0) > 0 && (
                <div className="flex justify-between items-center w-full">
                  <span className="text-[14px] font-bold text-slate-700 tracking-wide">Tax Amount</span>
                  <span className="text-[15px] font-bold text-slate-900 font-mono">
                    ₹ {Number(props.totals.taxTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {(props.totals?.roundOff || 0) !== 0 ? (
                <div className="flex justify-between items-center w-full">
                  <button 
                    type="button"
                    onClick={() => setIsRoundOffModalOpen(true)} 
                    className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer text-left"
                  >
                    Round Off
                  </button>
                  <span className="text-[15px] font-bold text-slate-900 font-mono">
                    {(props.totals.roundOff > 0 ? "+ " : "- ")}₹ {Math.abs(Number(props.totals.roundOff)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsRoundOffModalOpen(true)} 
                  className="text-[14px] font-bold text-indigo-700 tracking-wide cursor-pointer hover:underline"
                >
                  + Round Off
                </button>
              )}

              {/* Payment Status Row */}
              {(props.amountReceived || 0) > 0 || props.markAsFullyPaid ? (
                <div className="flex justify-between items-center w-full">
                  <button 
                    type="button"
                    onClick={() => {
                      setPaymentAmount(String(props.amountReceived || ""));
                      setIsFullyPaid(Boolean(props.markAsFullyPaid));
                      setLocalPaymentMethod(props.paymentMethod || "Bank Transfer");
                      setIsPaymentModalOpen(true);
                    }} 
                    className="text-[14px] font-bold text-emerald-600 underline tracking-wide cursor-pointer text-left"
                  >
                    Paid ({props.paymentMethod || "Bank Transfer"})
                  </button>
                  <span className="text-[15px] font-bold text-emerald-600 font-mono">
                    ₹ {Number(props.amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => {
                    setPaymentAmount("");
                    setIsFullyPaid(false);
                    setLocalPaymentMethod(props.paymentMethod || "Bank Transfer");
                    setIsPaymentModalOpen(true);
                  }} 
                  className="text-[14px] font-bold text-indigo-700 tracking-wide cursor-pointer hover:underline"
                >
                  + Payment / Amount Paid
                </button>
              )}

              <button 
                type="button"
                onClick={() => toast({ title: "TCS Info", description: "TCS is auto-calculated based on party turnover limits." })} 
                className="text-[14px] font-bold text-indigo-700 tracking-wide cursor-pointer hover:underline"
              >
                + Apply TCS
              </button>
              <button 
                type="button"
                onClick={() => {
                  setNotes(props.notes || "");
                  setIsNotesModalOpen(true);
                }} 
                className="text-[14px] font-bold text-indigo-700 tracking-wide cursor-pointer hover:underline"
              >
                {props.notes ? "Edit Notes" : "+ Notes"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3.8 Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-[max(0px,env(safe-area-inset-bottom))] shadow-lg">
        <div className="flex justify-between items-center px-4 py-3 bg-white">
          <span className="text-[15px] font-bold text-slate-900">Total Amount</span>
          <div className="flex flex-col items-end">
            <span className="text-[18px] font-bold text-slate-900 border-t border-slate-300 min-w-[120px] text-right pt-0.5 font-mono">
              ₹ {Number(props.totals?.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-2 px-3 pb-3 bg-white">
          <button 
            type="button"
            onClick={handleSaveAndNew}
            disabled={props.saving}
            className={`col-span-3 ${props.saving ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200 active:bg-slate-300 cursor-pointer"} bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold text-[13px] text-center transition-colors shadow-2xs`}
          >
            Save & New
          </button>
          <button 
            type="button"
            onClick={() => setIsBillPreviewOpen(true)}
            className="col-span-4 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-bold text-[13px] text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Preview Bill</span>
          </button>
          <button 
            type="button"
            onClick={handleGenerateBill}
            disabled={props.saving}
            className={`col-span-5 ${props.saving ? "opacity-75 cursor-wait" : "hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer"} bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[13px] text-center flex items-center justify-center gap-1 shadow-md transition-colors`}
          >
            {props.saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Generate Bill</span>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      {isPartyModalOpen && (
        <SelectPartyModal 
          onClose={() => setIsPartyModalOpen(false)}
          customers={props.suppliers}
          partyType="supplier"
          onPartyCreated={(newSupp) => {
            if (props.onSupplierCreated) {
              props.onSupplierCreated(newSupp);
            }
          }}
          onSelect={(id, supplierData) => {
            props.onSetSelectedSupplierId(id, supplierData);
            setIsPartyModalOpen(false);
          }}
        />
      )}

      {isItemModalOpen && (
        <AddItemModal
          onClose={() => setIsItemModalOpen(false)}
          catalog={props.catalog}
          priceMode="purchase"
          onAddSelectedItems={(newItems, keepOpen) => {
            props.onAddSelectedItems(newItems);
            if (!keepOpen) setIsItemModalOpen(false);
          }}
        />
      )}

      {/* Edit Item Modal */}
      {editingItemIndex !== null && props.recalculatedItems && props.recalculatedItems[editingItemIndex] && (
        <EditItemModal
          item={props.recalculatedItems[editingItemIndex]}
          onClose={() => {
            setEditingItemIndex(null);
            setEditingItemId(null);
          }}
          onSave={(updatedItem) => {
            const rowKey = editingItemId || editingItemIndex;
            if (props.onUpdateItemFields) {
              props.onUpdateItemFields(rowKey, {
                rate: updatedItem.rate,
                quantity: updatedItem.quantity,
                discountPercent: updatedItem.discountPercent,
                discountAmount: updatedItem.discountAmount,
                taxRate: updatedItem.taxRate,
                unit: updatedItem.unit,
                taxType: updatedItem.taxType,
              });
            } else {
              props.onUpdateItem(rowKey, 'rate', updatedItem.rate);
              props.onUpdateItem(rowKey, 'quantity', updatedItem.quantity);
              props.onUpdateItem(rowKey, 'discountPercent', updatedItem.discountPercent);
              props.onUpdateItem(rowKey, 'discountAmount', updatedItem.discountAmount);
              props.onUpdateItem(rowKey, 'taxRate', updatedItem.taxRate);
              props.onUpdateItem(rowKey, 'unit', updatedItem.unit);
              if (updatedItem.taxType) {
                props.onUpdateItem(rowKey, 'taxType', updatedItem.taxType);
              }
            }
            setEditingItemIndex(null);
            setEditingItemId(null);
          }}
          onDelete={() => {
            const rowKey = editingItemId || editingItemIndex;
            props.onRemoveItem(rowKey);
            setEditingItemIndex(null);
            setEditingItemId(null);
          }}
        />
      )}

      {/* Edit Invoice Metadata Bottom Sheet */}
      {isMetadataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900 text-lg">Edit Bill Details</h3>
              <button 
                type="button"
                onClick={() => setIsMetadataModalOpen(false)} 
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-600"/>
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1">Prefix</label>
                  <input 
                    type="text" 
                    value={editPrefix} 
                    onChange={(e) => setEditPrefix(e.target.value)} 
                    placeholder="PUR-" 
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1">Bill Number</label>
                  <input 
                    type="text" 
                    value={editSeq} 
                    onChange={(e) => setEditSeq(e.target.value)} 
                    placeholder="101" 
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 font-mono" 
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1">Bill Date</label>
                <input 
                  type="date" 
                  value={editDocDate} 
                  onChange={(e) => setEditDocDate(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500" 
                />
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-600 uppercase tracking-wider">Show Due Date</label>
                  <input 
                    type="checkbox" 
                    checked={editShowDueDate} 
                    onChange={(e) => setEditShowDueDate(e.target.checked)} 
                    className="w-4 h-4 accent-indigo-600" 
                  />
                </div>
                {editShowDueDate && (
                  <input 
                    type="date" 
                    value={editDueDate} 
                    onChange={(e) => setEditDueDate(e.target.value)} 
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 animate-in fade-in" 
                  />
                )}
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (props.onUpdateDocDetails) {
                    props.onUpdateDocDetails({
                      invoicePrefix: editPrefix,
                      invoiceNumberSeq: editSeq,
                      docDate: editDocDate,
                      dueDate: editDueDate,
                      showDueDate: editShowDueDate,
                    });
                  }
                  setIsMetadataModalOpen(false);
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl mt-3 shadow-md active:scale-95 transition-all cursor-pointer text-sm"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Bottom Sheet Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900 text-lg">Payment Details</h3>
              <button 
                type="button"
                onClick={() => setIsPaymentModalOpen(false)} 
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-600"/>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50">
                <div>
                  <span className="font-bold text-slate-800 text-sm block">Mark as Fully Paid</span>
                  <span className="text-[11px] text-slate-500">Auto-fill full bill amount as paid</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isFullyPaid} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsFullyPaid(checked);
                    if (checked) {
                      setPaymentAmount(String(props.totals?.grandTotal || 0));
                    }
                  }} 
                  className="w-5 h-5 accent-indigo-600" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Amount Paid (₹)
                </label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={paymentAmount} 
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    if (Number(e.target.value) < (props.totals?.grandTotal || 0)) {
                      setIsFullyPaid(false);
                    }
                  }} 
                  placeholder="0.00" 
                  className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 font-mono text-base" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Payment Method
                </label>
                <select
                  value={localPaymentMethod}
                  onChange={(e) => setLocalPaymentMethod(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit">Supplier Credit</option>
                </select>
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (props.onUpdatePayment) {
                    props.onUpdatePayment(Number(paymentAmount) || 0, isFullyPaid, localPaymentMethod);
                  }
                  setIsPaymentModalOpen(false);
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl mt-3 shadow-md active:scale-95 transition-all cursor-pointer text-sm"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Modals */}
      {isChargesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Additional Charges</h3>
              <button type="button" onClick={() => setIsChargesModalOpen(false)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
                <X className="w-5 h-5 text-slate-600"/>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Reason</label>
                <input 
                  type="text" 
                  value={chargesReason} 
                  onChange={(e) => setChargesReason(e.target.value)} 
                  placeholder="e.g. Delivery / Shipping" 
                  className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Amount (₹)</label>
                <input 
                  type="number" 
                  value={chargesAmount} 
                  onChange={(e) => setChargesAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors font-mono" 
                />
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (props.onUpdateAdditionalCharges) props.onUpdateAdditionalCharges(Number(chargesAmount) || 0, chargesReason);
                  setIsChargesModalOpen(false);
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-all cursor-pointer text-sm"
              >
                Save Charges
              </button>
            </div>
          </div>
        </div>
      )}

      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Overall Discount</h3>
              <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
                <X className="w-5 h-5 text-slate-600"/>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setDiscountType("percent")} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${discountType === "percent" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"}`}
                >
                  Percentage (%)
                </button>
                <button 
                  type="button"
                  onClick={() => setDiscountType("flat")} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${discountType === "flat" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"}`}
                >
                  Flat Amount (₹)
                </button>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Discount Value</label>
                <input 
                  type="number" 
                  value={discountValue} 
                  onChange={(e) => setDiscountValue(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors font-mono" 
                />
              </div>
              <button 
                type="button"
                onClick={() => {
                  const updater = props.onUpdateOverallDiscount || props.onUpdateDiscount;
                  if (updater) updater(discountType, Number(discountValue) || 0);
                  setIsDiscountModalOpen(false);
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-all cursor-pointer text-sm"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {isRoundOffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Round Off</h3>
              <button type="button" onClick={() => setIsRoundOffModalOpen(false)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
                <X className="w-5 h-5 text-slate-600"/>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                <span className="font-bold text-slate-700 text-sm">Auto Round Off</span>
                <input type="checkbox" checked={autoRoundOff} onChange={(e) => setAutoRoundOff(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
              </div>
              {!autoRoundOff && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 mt-2">Manual Round Off Amount (₹)</label>
                  <input 
                    type="number" 
                    value={manualRoundOff} 
                    onChange={(e) => setManualRoundOff(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors font-mono" 
                  />
                </div>
              )}
              <button 
                type="button"
                onClick={() => {
                  if (props.onUpdateRoundOff) props.onUpdateRoundOff(autoRoundOff, Number(manualRoundOff) || 0);
                  setIsRoundOffModalOpen(false);
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-all cursor-pointer text-sm"
              >
                Save Round Off
              </button>
            </div>
          </div>
        </div>
      )}

      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Add Notes</h3>
              <button type="button" onClick={() => setIsNotesModalOpen(false)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
                <X className="w-5 h-5 text-slate-600"/>
              </button>
            </div>
            <div className="space-y-4">
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Enter bill notes, terms, delivery remarks, etc..." 
                className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors min-h-[120px] resize-none text-sm" 
              />
              <button 
                type="button"
                onClick={() => {
                  if (props.onUpdateNotes) props.onUpdateNotes(notes);
                  setIsNotesModalOpen(false);
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-all cursor-pointer text-sm"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Mobile Bill Preview Modal */}
      <MobileBillPreviewModal
        open={isBillPreviewOpen}
        onClose={() => setIsBillPreviewOpen(false)}
        onGenerateBill={() => {
          setIsBillPreviewOpen(false);
          handleGenerateBill();
        }}
        docType={props.docType}
        invoiceNumber={`${props.invoicePrefix}${props.invoiceNumberSeq}`}
        docDate={props.docDate}
        dueDate={props.dueDate}
        partyName={props.partyName}
        partyPhone={props.partyPhone}
        partyGstin={props.partyGstin}
        partyAddress={props.partyAddress}
        placeOfSupply={props.placeOfSupply}
        items={populatedItems}
        totals={props.totals}
        storeInfo={props.storeInfo}
        amountReceived={props.amountReceived}
        markAsFullyPaid={props.markAsFullyPaid}
        paymentMethod={props.paymentMethod}
        notes={notes || props.notes}
        terms={props.terms}
        ewayBillNo={props.ewayBillNo}
        vehicleNumber={props.vehicleNumber}
        poReference={props.poReference}
      />
    </div>
  );
}