import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  FileText,
  MapPin,
  Calendar,
  Building2,
  Package,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowRight,
} from "lucide-react";
import {
  EwayBillRecord,
  EwayItem,
  EwayDocType,
  EwaySupplyType,
  EwaySubSupplyType,
  EwayTransMode,
  EwayVehicleType,
} from "@/types/ewayBill";
import {
  generateEwayBillNumber,
  calculateEwayBillValidity,
  estimatePincodeDistance,
  ewayBillService,
} from "@/services/ewayBillService";
import { useOrganization } from "@/hooks/useOrganization";
import { INDIAN_STATES_AND_CODES } from "@/utils/suggestionData";
import { toast } from "sonner";
import { BusinessDocument } from "@/types/documents";

interface GenerateEwayBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialInvoice?: BusinessDocument | null;
  onSuccess?: (record: EwayBillRecord) => void;
}

export const GenerateEwayBillModal: React.FC<GenerateEwayBillModalProps> = ({
  open,
  onOpenChange,
  initialInvoice,
  onSuccess,
}) => {
  const { orgId, org } = useOrganization();
  const [activeTab, setActiveTab] = useState<"parties" | "items" | "transport" | "review">("parties");

  // Document Info
  const [docType, setDocType] = useState<EwayDocType>("INV");
  const [docNo, setDocNo] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplyType, setSupplyType] = useState<EwaySupplyType>("O");
  const [subSupplyType, setSubSupplyType] = useState<EwaySubSupplyType>("1");
  const [subSupplyDesc, setSubSupplyDesc] = useState("");

  // Consignor (From)
  const [fromGstin, setFromGstin] = useState("");
  const [fromTrdName, setFromTrdName] = useState("");
  const [fromAddr1, setFromAddr1] = useState("");
  const [fromPlace, setFromPlace] = useState("");
  const [fromPincode, setFromPincode] = useState("");
  const [fromStateCode, setFromStateCode] = useState("27-Maharashtra");

  // Consignee (To)
  const [toGstin, setToGstin] = useState("");
  const [toTrdName, setToTrdName] = useState("");
  const [toAddr1, setToAddr1] = useState("");
  const [toPlace, setToPlace] = useState("");
  const [toPincode, setToPincode] = useState("");
  const [toStateCode, setToStateCode] = useState("27-Maharashtra");

  // Items
  const [items, setItems] = useState<EwayItem[]>([]);

  // Transport (Part-B)
  const [transMode, setTransMode] = useState<EwayTransMode>("1");
  const [transDistance, setTransDistance] = useState<number>(100);
  const [vehicleType, setVehicleType] = useState<EwayVehicleType>("R");
  const [vehicleNo, setVehicleNo] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [transDocNo, setTransDocNo] = useState("");
  const [transDocDate, setTransDocDate] = useState(new Date().toISOString().split("T")[0]);

  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize or Prefill from Organization and Initial Invoice
  useEffect(() => {
    if (!open) return;

    // Consignor defaults from Org
    const orgState = org?.state || "27-Maharashtra";
    const matchedState = INDIAN_STATES_AND_CODES.find((s) => s.toLowerCase().includes(orgState.toLowerCase())) || "27-Maharashtra";

    setFromGstin(org?.gstin || "27AABCC1234F1Z5");
    setFromTrdName(org?.name || "CredSmart Store");
    setFromAddr1(org?.address || "Main Industrial Area");
    setFromPlace(org?.city || "Mumbai");
    setFromPincode(org?.pincode || "400001");
    setFromStateCode(matchedState);

    if (initialInvoice) {
      setDocNo(initialInvoice.documentNumber);
      setDocDate(initialInvoice.docDate || new Date().toISOString().split("T")[0]);
      setDocType(initialInvoice.docType === "delivery_challan" ? "CHL" : "INV");

      setToTrdName(initialInvoice.partyName || "");
      setToGstin(initialInvoice.partyGstin || "URP");
      setToAddr1(initialInvoice.partyAddress || initialInvoice.billingAddress || "Commercial Market");
      setToPlace(initialInvoice.billingPlaceOfSupply?.split("-")[1] || "Destination City");
      const cleanToPin = initialInvoice.billingPincode || "411001";
      setToPincode(cleanToPin);

      if (initialInvoice.placeOfSupply) {
        const pMatch = INDIAN_STATES_AND_CODES.find((s) => s.startsWith(initialInvoice.placeOfSupply.slice(0, 2)));
        if (pMatch) setToStateCode(pMatch);
      }

      // Convert invoice items to EwayItems
      if (initialInvoice.items && initialInvoice.items.length > 0) {
        const converted: EwayItem[] = initialInvoice.items.map((it) => {
          const isInterState = initialInvoice.placeOfSupply && !initialInvoice.placeOfSupply.startsWith(org?.state?.slice(0, 2) || "27");
          const taxRate = it.taxRate || 18;
          return {
            productName: it.productName,
            productDesc: it.productName,
            hsnCode: it.hsn || "999999",
            quantity: it.quantity || 1,
            qtyUnit: it.unit || "PCS",
            taxableAmount: it.taxableAmount || (it.rate * it.quantity),
            cgstRate: isInterState ? 0 : taxRate / 2,
            cgstAmount: isInterState ? 0 : (it.cgstAmount || (it.taxableAmount * taxRate / 200)),
            sgstRate: isInterState ? 0 : taxRate / 2,
            sgstAmount: isInterState ? 0 : (it.sgstAmount || (it.taxableAmount * taxRate / 200)),
            igstRate: isInterState ? taxRate : 0,
            igstAmount: isInterState ? (it.igstAmount || (it.taxableAmount * taxRate / 100)) : 0,
            cessRate: 0,
            cessAmount: 0,
          };
        });
        setItems(converted);
      }

      // Pre-fill vehicle if present
      if (initialInvoice.transportDetails?.vehicleNumber) {
        setVehicleNo(initialInvoice.transportDetails.vehicleNumber);
      }

      // Estimate distance
      const dist = estimatePincodeDistance(org?.pincode || "400001", cleanToPin);
      setTransDistance(dist);
    } else {
      // Blank setup
      setDocNo(`INV-${Date.now().toString().slice(-5)}`);
      setDocDate(new Date().toISOString().split("T")[0]);
      setToTrdName("");
      setToGstin("");
      setToAddr1("");
      setToPlace("");
      setToPincode("");
      setItems([
        {
          productName: "Commercial Goods Consignment",
          hsnCode: "84713010",
          quantity: 1,
          qtyUnit: "PCS",
          taxableAmount: 55000,
          cgstRate: 9,
          cgstAmount: 4950,
          sgstRate: 9,
          sgstAmount: 4950,
          igstRate: 0,
          igstAmount: 0,
        },
      ]);
      setTransDistance(120);
    }

    setActiveTab("parties");
  }, [open, initialInvoice, org]);

  // Financial calculations across items
  const totals = useMemo(() => {
    let totalTaxable = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let cessTotal = 0;

    items.forEach((it) => {
      totalTaxable += it.taxableAmount || 0;
      cgstTotal += it.cgstAmount || 0;
      sgstTotal += it.sgstAmount || 0;
      igstTotal += it.igstAmount || 0;
      cessTotal += it.cessAmount || 0;
    });

    const totInvValue = Math.round(totalTaxable + cgstTotal + sgstTotal + igstTotal + cessTotal);
    return {
      totalTaxable,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
      totInvValue,
    };
  }, [items]);

  // Validity Calculation
  const validity = useMemo(() => {
    return calculateEwayBillValidity(transDistance, vehicleType);
  }, [transDistance, vehicleType]);

  const handleEstimateDistance = () => {
    const dist = estimatePincodeDistance(fromPincode, toPincode);
    setTransDistance(dist);
    toast.info(`Estimated Pin-to-Pin Route Distance: ${dist} KM`);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: "",
        hsnCode: "",
        quantity: 1,
        qtyUnit: "PCS",
        taxableAmount: 0,
        cgstRate: 9,
        cgstAmount: 0,
        sgstRate: 9,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof EwayItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };

      // Recalculate taxes if taxableAmount or rates changed
      if (
        field === "taxableAmount" ||
        field === "cgstRate" ||
        field === "sgstRate" ||
        field === "igstRate"
      ) {
        const taxable = Number(cur.taxableAmount) || 0;
        cur.cgstAmount = (taxable * (Number(cur.cgstRate) || 0)) / 100;
        cur.sgstAmount = (taxable * (Number(cur.sgstRate) || 0)) / 100;
        cur.igstAmount = (taxable * (Number(cur.igstRate) || 0)) / 100;
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("An E-Way Bill must contain at least one item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async (partAOnly: boolean = false) => {
    if (!docNo.trim()) {
      toast.error("Document Number is required");
      setActiveTab("parties");
      return;
    }
    if (!toTrdName.trim()) {
      toast.error("Recipient Trade Name is required");
      setActiveTab("parties");
      return;
    }
    if (!toPincode.trim() || toPincode.replace(/\D/g, "").length !== 6) {
      toast.error("Valid 6-digit Destination Pincode is required");
      setActiveTab("parties");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.productName.trim())) {
      toast.error("Please provide valid product names for all consignment items");
      setActiveTab("items");
      return;
    }

    const cleanVehicle = vehicleNo.replace(/\s/g, "").toUpperCase();
    if (!partAOnly && transMode === "1" && !cleanVehicle) {
      toast.error("Vehicle Number is required for Part-B generation on road transit");
      setActiveTab("transport");
      return;
    }

    setIsGenerating(true);
    try {
      const stateCodeOnly = fromStateCode.slice(0, 2);
      const ewayNo = generateEwayBillNumber(stateCodeOnly);
      const now = new Date();
      const validUpto = validity.expiryDate.toISOString();

      const newRecord: EwayBillRecord = {
        id: `ewb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        organizationId: orgId || "default_org",
        ewayBillNo: ewayNo,
        ewayBillDate: now.toISOString(),
        validUpto,
        status: partAOnly ? "part_a_only" : "active",

        invoiceId: initialInvoice?.id,
        docType,
        docNo: docNo.trim(),
        docDate,
        supplyType,
        subSupplyType,
        subSupplyDesc: subSupplyDesc.trim() || undefined,

        fromGstin: fromGstin.trim().toUpperCase(),
        fromTrdName: fromTrdName.trim(),
        fromAddr1: fromAddr1.trim(),
        fromPlace: fromPlace.trim(),
        fromPincode: fromPincode.trim(),
        fromStateCode: stateCodeOnly,

        toGstin: toGstin.trim().toUpperCase() || "URP",
        toTrdName: toTrdName.trim(),
        toAddr1: toAddr1.trim(),
        toPlace: toPlace.trim(),
        toPincode: toPincode.trim(),
        toStateCode: toStateCode.slice(0, 2),

        totalValue: totals.totalTaxable,
        cgstValue: totals.cgstTotal,
        sgstValue: totals.sgstTotal,
        igstValue: totals.igstTotal,
        cessValue: totals.cessTotal,
        totInvValue: totals.totInvValue,
        itemList: items,

        transMode,
        transDistance: Number(transDistance) || 100,
        transporterId: transporterId.trim() || undefined,
        transporterName: transporterName.trim() || undefined,
        transDocNo: transDocNo.trim() || undefined,
        transDocDate: transDocDate || undefined,
        vehicleNo: partAOnly ? undefined : cleanVehicle,
        vehicleType,

        created_at: now.toISOString(),
      };

      const saved = await ewayBillService.saveEwayBill(newRecord);
      toast.success(
        `E-Way Bill ${saved.ewayBillNo} successfully generated! (${partAOnly ? "Part-A Created" : "Full Part-A & Part-B Active"})`
      );

      onSuccess?.(saved);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error)?.message || "Failed to generate E-Way Bill");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-2xl p-0 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/90 border border-indigo-400/30 flex items-center justify-center text-white shadow-md shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                Generate GST E-Way Bill
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Form GST EWB-01
                </span>
              </DialogTitle>
              <p className="hidden sm:block text-xs text-slate-300">
                Official Indian GST compliant consignment transit documentation
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Consignment Value
            </span>
            <span className="text-lg font-black font-mono text-emerald-400">
              ₹{totals.totInvValue.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 sm:px-6 shrink-0 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="h-14 sm:h-11 bg-transparent p-0 gap-4 sm:gap-6 border-b-0 w-max min-w-full justify-start">
              <TabsTrigger
                value="parties"
                className="min-h-11 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent px-1 pb-3 pt-2 text-[11px] sm:text-xs font-bold gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5" />
                1. Part-A: Parties & Document
              </TabsTrigger>
              <TabsTrigger
                value="items"
                className="min-h-11 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent px-1 pb-3 pt-2 text-[11px] sm:text-xs font-bold gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <Package className="w-3.5 h-3.5" />
                2. Consignment Items ({items.length})
              </TabsTrigger>
              <TabsTrigger
                value="transport"
                className="min-h-11 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent px-1 pb-3 pt-2 text-[11px] sm:text-xs font-bold gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <Truck className="w-3.5 h-3.5" />
                3. Part-B: Transport & Vehicle
              </TabsTrigger>
              <TabsTrigger
                value="review"
                className="min-h-11 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent px-1 pb-3 pt-2 text-[11px] sm:text-xs font-bold gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                4. Compliance & Generation
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 text-xs overscroll-contain">
          {/* TAB 1: PARTIES & DOCUMENT */}
          {activeTab === "parties" && (
            <div className="space-y-6">
              {/* Document Identity */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  Document Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Document Type
                    </Label>
                    <Select value={docType} onValueChange={(v) => setDocType(v as EwayDocType)}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INV">Tax Invoice</SelectItem>
                        <SelectItem value="BIL">Bill of Supply</SelectItem>
                        <SelectItem value="CHL">Delivery Challan</SelectItem>
                        <SelectItem value="BOE">Bill of Entry</SelectItem>
                        <SelectItem value="OTH">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Document No. <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={docNo}
                      onChange={(e) => setDocNo(e.target.value)}
                      placeholder="e.g. INV-0042"
                      className="h-8 text-xs font-mono font-bold mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Document Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Sub-Supply Type
                    </Label>
                    <Select value={subSupplyType} onValueChange={(v) => setSubSupplyType(v as EwaySubSupplyType)}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Supply</SelectItem>
                        <SelectItem value="2">2 - Import</SelectItem>
                        <SelectItem value="3">3 - Export</SelectItem>
                        <SelectItem value="4">4 - Job Work</SelectItem>
                        <SelectItem value="5">5 - For Own Use</SelectItem>
                        <SelectItem value="7">7 - Sales Return</SelectItem>
                        <SelectItem value="8">8 - Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Consignor (From) & Consignee (To) Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Consignor */}
                <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      Consignor (Dispatch From)
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      Your Business
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">GSTIN</Label>
                      <Input
                        value={fromGstin}
                        onChange={(e) => setFromGstin(e.target.value.toUpperCase())}
                        className="h-7 text-xs font-mono font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Trade Name</Label>
                      <Input
                        value={fromTrdName}
                        onChange={(e) => setFromTrdName(e.target.value)}
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Address</Label>
                      <Input
                        value={fromAddr1}
                        onChange={(e) => setFromAddr1(e.target.value)}
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Place / City</Label>
                        <Input
                          value={fromPlace}
                          onChange={(e) => setFromPlace(e.target.value)}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Pincode</Label>
                        <Input
                          value={fromPincode}
                          onChange={(e) => setFromPincode(e.target.value)}
                          maxLength={6}
                          className="h-7 text-xs font-mono mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">State</Label>
                        <Select value={fromStateCode} onValueChange={setFromStateCode}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {INDIAN_STATES_AND_CODES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consignee */}
                <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Consignee (Bill & Ship To)
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      Destination Party
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">
                        GSTIN (or "URP" if unregistered)
                      </Label>
                      <Input
                        value={toGstin}
                        onChange={(e) => setToGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 27AABCT1234F1Z1 or URP"
                        className="h-7 text-xs font-mono mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">
                        Recipient Trade Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={toTrdName}
                        onChange={(e) => setToTrdName(e.target.value)}
                        placeholder="Customer / Consignee Name"
                        className="h-7 text-xs font-semibold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Address</Label>
                      <Input
                        value={toAddr1}
                        onChange={(e) => setToAddr1(e.target.value)}
                        placeholder="Destination Delivery Address"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Place / City</Label>
                        <Input
                          value={toPlace}
                          onChange={(e) => setToPlace(e.target.value)}
                          placeholder="City"
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">
                          Pincode <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={toPincode}
                          onChange={(e) => setToPincode(e.target.value)}
                          placeholder="6-digit"
                          maxLength={6}
                          className="h-7 text-xs font-mono font-bold mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">State</Label>
                        <Select value={toStateCode} onValueChange={setToStateCode}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {INDIAN_STATES_AND_CODES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ITEMS */}
          {activeTab === "items" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Consignment Items & Tax Manifest
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Specify items, HSN classifications, and applicable GST rates
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </Button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    <tr>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5 w-28">HSN Code</th>
                      <th className="p-2.5 w-20">Qty</th>
                      <th className="p-2.5 w-20">Unit</th>
                      <th className="p-2.5 w-28">Taxable (₹)</th>
                      <th className="p-2.5 w-20">CGST %</th>
                      <th className="p-2.5 w-20">SGST %</th>
                      <th className="p-2.5 w-20">IGST %</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-2">
                          <Input
                            value={item.productName}
                            onChange={(e) => handleUpdateItem(idx, "productName", e.target.value)}
                            placeholder="Item description"
                            className="h-7 text-xs font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.hsnCode}
                            onChange={(e) => handleUpdateItem(idx, "hsnCode", e.target.value)}
                            placeholder="HSN"
                            className="h-7 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, "quantity", Number(e.target.value) || 0)}
                            className="h-7 text-xs font-mono text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.qtyUnit}
                            onChange={(e) => handleUpdateItem(idx, "qtyUnit", e.target.value.toUpperCase())}
                            className="h-7 text-xs font-mono uppercase text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.taxableAmount}
                            onChange={(e) => handleUpdateItem(idx, "taxableAmount", Number(e.target.value) || 0)}
                            className="h-7 text-xs font-mono text-right font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.cgstRate}
                            onChange={(e) => handleUpdateItem(idx, "cgstRate", Number(e.target.value) || 0)}
                            className="h-7 text-xs font-mono text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.sgstRate}
                            onChange={(e) => handleUpdateItem(idx, "sgstRate", Number(e.target.value) || 0)}
                            className="h-7 text-xs font-mono text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.igstRate}
                            onChange={(e) => handleUpdateItem(idx, "igstRate", Number(e.target.value) || 0)}
                            className="h-7 text-xs font-mono text-right"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                    Taxable Value
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                    ₹{totals.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                    CGST + SGST
                  </span>
                  <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                    ₹{(totals.cgstTotal + totals.sgstTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                    IGST Value
                  </span>
                  <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                    ₹{totals.igstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider block">
                    Total Consignment Value
                  </span>
                  <span className="text-base font-mono font-black text-indigo-600 dark:text-indigo-400">
                    ₹{totals.totInvValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSPORT & PART-B */}
          {activeTab === "transport" && (
            <div className="space-y-5">
              {/* Distance Estimation Card */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-xs">
                      Route Distance & GST Validity Computation
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEstimateDistance}
                    className="h-7 text-xs gap-1.5 font-bold text-indigo-600 border-indigo-300"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Estimate Pin-to-Pin
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Approximate Distance (in KM) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={transDistance}
                      onChange={(e) => setTransDistance(Math.max(1, Number(e.target.value) || 1))}
                      className="h-8 text-xs font-mono font-bold mt-1"
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      From: {fromPincode || "Origin"} ➔ To: {toPincode || "Destination"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Cargo Type
                    </Label>
                    <Select
                      value={vehicleType}
                      onValueChange={(v) => setVehicleType(v as EwayVehicleType)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R">Regular Cargo (200 km/day)</SelectItem>
                        <SelectItem value="O">Over Dimensional Cargo (20 km/day)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-center flex flex-col justify-center">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                      Calculated Validity Duration
                    </span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {validity.validDays} Day{validity.validDays > 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Expires: {validity.expiryDate.toLocaleDateString("en-IN")} at 23:59 PM
                    </span>
                  </div>
                </div>
              </div>

              {/* Part-B Vehicle Details */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Part-B Vehicle Assignment
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Optional if generating Part-A only (transporter will assign later)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Mode of Transport
                    </Label>
                    <Select
                      value={transMode}
                      onValueChange={(v) => setTransMode(v as EwayTransMode)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Road</SelectItem>
                        <SelectItem value="2">2 - Rail</SelectItem>
                        <SelectItem value="3">3 - Air</SelectItem>
                        <SelectItem value="4">4 - Ship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Vehicle Number
                    </Label>
                    <Input
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                      placeholder="e.g. MH12AB1234"
                      className="h-8 text-xs font-mono uppercase font-bold mt-1"
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Required for active transit movement
                    </p>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Transporter ID / TRANSIN
                    </Label>
                    <Input
                      value={transporterId}
                      onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                      placeholder="15-char TRANSIN / GSTIN"
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Transporter Trade Name
                    </Label>
                    <Input
                      value={transporterName}
                      onChange={(e) => setTransporterName(e.target.value)}
                      placeholder="e.g. VRL Logistics / Blue Dart"
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Trans Doc / LR Number
                    </Label>
                    <Input
                      value={transDocNo}
                      onChange={(e) => setTransDocNo(e.target.value)}
                      placeholder="LR / RR / Airway Bill No."
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Trans Doc Date
                    </Label>
                    <Input
                      type="date"
                      value={transDocDate}
                      onChange={(e) => setTransDocDate(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEW & COMPLIANCE */}
          {activeTab === "review" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    Ready to Generate Official E-Way Bill
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                    All mandatory fields according to Rule 138 of CGST Rules have been validated. This will create a standard Form GST EWB-01 record and official verification QR code.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                    Document
                  </span>
                  <span className="font-bold text-xs">
                    {docType} - {docNo}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                    Party (Consignee)
                  </span>
                  <span className="font-bold text-xs truncate block">
                    {toTrdName}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                    Vehicle Number
                  </span>
                  <span className="font-bold text-xs font-mono">
                    {vehicleNo || "Pending (Part-A Only)"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                    Validity Period
                  </span>
                  <span className="font-bold text-xs text-indigo-600">
                    {validity.validDays} Day(s)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Generation Mode:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => handleGenerate(false)}
                    className="p-3.5 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                        Full E-Way Bill (Part-A + Part-B)
                      </span>
                      <Truck className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                      Goods are ready with assigned vehicle {vehicleNo || "[Vehicle No]"}. Generates full transit slip with immediate validity countdown.
                    </p>
                  </div>

                  <div
                    onClick={() => handleGenerate(true)}
                    className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Generate Part-A Only
                      </span>
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Generates E-Way Bill without vehicle assignment. Vehicle can be updated later by you or your transporter prior to transit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-3 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {activeTab !== "parties" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === "review") setActiveTab("transport");
                  else if (activeTab === "transport") setActiveTab("items");
                  else if (activeTab === "items") setActiveTab("parties");
                }}
                className="min-h-11"
              >
                Back
              </Button>
            )}

            {activeTab !== "review" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (activeTab === "parties") setActiveTab("items");
                  else if (activeTab === "items") setActiveTab("transport");
                  else if (activeTab === "transport") setActiveTab("review");
                }}
                className="min-h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isGenerating}
                onClick={() => handleGenerate(false)}
                className="min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isGenerating ? "Generating..." : "Generate E-Way Bill Now"}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
