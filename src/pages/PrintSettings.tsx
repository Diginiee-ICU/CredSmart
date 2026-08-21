import { useState, useRef, useEffect } from "react";
import {
  Printer,
  ScanBarcode,
  Scale,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Receipt,
  FileText,
  Plus,
  Store,
  Upload,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Percent,
  Hash,
  Sparkles,
  Trash2,
  CheckCircle2,
  Layers,
  Sliders,
  Cpu,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableReceiptItem } from "@/components/SortableReceiptItem";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SettingsNavSidebar } from "@/components/settings/SettingsNavSidebar";

const receiptFormats = [
  { id: "58mm", label: "58mm Thermal Receipt", icon: Receipt, width: "220px" },
  { id: "80mm", label: "80mm Standard POS", icon: Receipt, width: "300px" },
  { id: "a4", label: "Full A4 Tax Invoice", icon: FileText, width: "100%" },
];

const allReceiptComponents = [
  "Store Logo",
  "Store Name & Address",
  "Date & Time",
  "Items Table",
  "Tax Breakdown",
  "Total Amount",
  "Payment Method",
  "UPI QR Code",
  "Footer Message",
  "Barcode",
];

export default function PrintSettings() {
  const { org, orgId } = useOrganization();
  const [selectedFormat, setSelectedFormat] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_receipt_designer_settings");
      return saved ? JSON.parse(saved).format || "80mm" : "80mm";
    } catch {
      return "80mm";
    }
  });

  const [receiptFooter, setReceiptFooter] = useState(() => {
    return localStorage.getItem("pos_receipt_footer") || "Thank you for your purchase! Visit again.";
  });

  const [autoEnter, setAutoEnter] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).autoEnter ?? true : true;
    } catch {
      return true;
    }
  });

  const [comPort, setComPort] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).comPort || "COM3 (Active)" : "COM3 (Active)";
    } catch {
      return "COM3 (Active)";
    }
  });

  const [cashDrawer, setCashDrawer] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).cashDrawer ?? false : false;
    } catch {
      return false;
    }
  });

  const [receiptPrinter, setReceiptPrinter] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).receiptPrinter || "Epson TM-T82II (Default)" : "Epson TM-T82II (Default)";
    } catch {
      return "Epson TM-T82II (Default)";
    }
  });

  const [activeComponents, setActiveComponents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pos_receipt_designer_settings");
      return saved ? JSON.parse(saved).components || [
        "Store Name & Address",
        "Date & Time",
        "Items Table",
        "Tax Breakdown",
        "Total Amount",
        "Payment Method",
        "Footer Message",
      ] : [
        "Store Name & Address",
        "Date & Time",
        "Items Table",
        "Tax Breakdown",
        "Total Amount",
        "Payment Method",
        "Footer Message",
      ];
    } catch {
      return [
        "Store Name & Address",
        "Date & Time",
        "Items Table",
        "Tax Breakdown",
        "Total Amount",
        "Payment Method",
        "Footer Message",
      ];
    }
  });

  const handleSaveHardwareAndReceipt = () => {
    try {
      localStorage.setItem(
        "pos_hardware_settings",
        JSON.stringify({
          autoEnter,
          comPort,
          cashDrawer,
          receiptPrinter,
        })
      );
      localStorage.setItem(
        "pos_receipt_designer_settings",
        JSON.stringify({
          format: selectedFormat,
          components: activeComponents,
        })
      );
      localStorage.setItem("pos_receipt_footer", receiptFooter.trim());
      toast({ title: "Print & Hardware Preferences Saved Successfully!" });
    } catch (err: any) {
      toast({ title: "Error saving print settings", description: err.message, variant: "destructive" });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActiveComponents((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addComponent = (comp: string) => {
    if (!activeComponents.includes(comp)) {
      setActiveComponents((prev) => [...prev, comp]);
    }
  };

  const removeComponent = (comp: string) => {
    setActiveComponents((prev) => prev.filter((c) => c !== comp));
  };

  const availableToAdd = allReceiptComponents.filter(
    (c) => !activeComponents.includes(c)
  );

  return (
    <div className="w-full max-w-[1550px] mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <SettingsNavSidebar activeItem="print" />

        {/* Main Content Area */}
        <main className="flex-1 w-full bg-card rounded-2xl border border-border/80 p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/70">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Print &amp; POS Hardware Settings
                </h1>
                <Badge className="bg-rose-500 text-white font-bold text-[10px]">New</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure thermal receipt formats, ESC/POS printers, weighing scales, and scanner signals
              </p>
            </div>

            <Button
              onClick={handleSaveHardwareAndReceipt}
              className="h-9 px-6 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold shadow-sm gap-1.5 transition-transform active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Print Settings</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left: Hardware & Peripherals */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#6366F1]" />
                Connected POS Hardware
              </h2>

              {/* Thermal Printer */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-2">
                <Label className="text-xs font-semibold text-foreground">Thermal Receipt Printer</Label>
                <select
                  value={receiptPrinter}
                  onChange={(e) => setReceiptPrinter(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium"
                >
                  <option value="Epson TM-T82II (Default)">Epson TM-T82II (Default)</option>
                  <option value="Star Micronics TSP143">Star Micronics TSP143</option>
                  <option value="TVS Electronics RP-3200">TVS Electronics RP-3200</option>
                  <option value="Generic ESC/POS Thermal">Generic ESC/POS Thermal</option>
                </select>
              </div>

              {/* Barcode Scanner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                <div>
                  <p className="text-xs font-bold text-foreground">Auto-Enter for Barcode Scanners</p>
                  <p className="text-[10px] text-muted-foreground">Trigger item lookup on scanner ENTER keystroke</p>
                </div>
                <button type="button" onClick={() => setAutoEnter(!autoEnter)}>
                  {autoEnter ? (
                    <ToggleRight className="w-8 h-8 text-[#6366F1]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Weighing scale */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-2">
                <Label className="text-xs font-semibold text-foreground">Digital Scale COM Port (RS-232/USB)</Label>
                <select
                  value={comPort}
                  onChange={(e) => setComPort(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium"
                >
                  <option value="COM3 (Active)">COM3 (Active)</option>
                  <option value="COM4">COM4</option>
                  <option value="COM5">COM5</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              {/* Cash Drawer Kick */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                <div>
                  <p className="text-xs font-bold text-foreground">Auto Cash Drawer Kick</p>
                  <p className="text-[10px] text-muted-foreground">Pulse RJ11/RJ12 drawer signal on bill save</p>
                </div>
                <button type="button" onClick={() => setCashDrawer(!cashDrawer)}>
                  {cashDrawer ? (
                    <ToggleRight className="w-8 h-8 text-[#6366F1]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Right: Thermal Receipt Format & Layout Designer */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#6366F1]" />
                Thermal Receipt Format &amp; Slogan
              </h2>

              {/* Format selection */}
              <div className="grid grid-cols-3 gap-2">
                {receiptFormats.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      selectedFormat === fmt.id
                        ? "border-[#6366F1] bg-indigo-50/20 text-[#6366F1] font-bold"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    <fmt.icon className="w-4 h-4" />
                    <span className="text-[11px]">{fmt.label}</span>
                  </button>
                ))}
              </div>

              {/* Footer Slogan */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Receipt Footer Slogan</Label>
                <Input
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Thank you for shopping with us! Visit again."
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Palette */}
              {availableToAdd.length > 0 && (
                <div className="p-3 rounded-xl bg-muted/40 border space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Add Components:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableToAdd.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => addComponent(c)}
                        className="px-2.5 py-1 rounded-lg bg-card border text-[11px] font-medium text-foreground hover:text-[#6366F1] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-[#6366F1]" /> {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DnD Layout list */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border flex flex-col items-center">
                <Badge variant="outline" className="mb-3 text-[10px]">
                  Thermal Receipt Layout ({selectedFormat}) — Drag to Reorder
                </Badge>
                <div className="w-full max-w-xs bg-white dark:bg-slate-900 border-2 border-dashed rounded-xl p-2 space-y-1.5 shadow-sm">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={activeComponents} strategy={verticalListSortingStrategy}>
                      {activeComponents.map((comp) => (
                        <SortableReceiptItem
                          key={comp}
                          id={comp}
                          label={comp}
                          onRemove={() => removeComponent(comp)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
