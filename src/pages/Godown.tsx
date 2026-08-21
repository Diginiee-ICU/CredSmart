import { useState, useEffect, useMemo } from "react";
import {
  Warehouse,
  Plus,
  ArrowRightLeft,
  Search,
  Package,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Clock,
  Truck,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Download,
  Printer,
  ChevronRight,
  X,
  Edit,
  Trash2,
  Layers,
} from "lucide-react";
import { Godown, StockTransfer, InventoryItem } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadCSV } from "@/utils/excelImportExport";

const DEFAULT_SAMPLE_GODOWNS: Godown[] = [
  {
    id: "g-01",
    name: "Central Main Warehouse",
    code: "WH-MAIN-01",
    address: "Plot 12, APMC Logistics Park, Sector 19",
    city: "Navi Mumbai",
    state: "Maharashtra",
    pincode: "400703",
    managerName: "Rajesh Sharma",
    phone: "9820098765",
    capacityUnits: 50000,
    isDefault: true,
    totalItemsStored: 3450,
    totalValuation: 2450000,
    status: "active",
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: "g-02",
    name: "North Branch Godown",
    code: "WH-NORTH-02",
    address: "Godown 4, GIDC Industrial Estate",
    city: "Thane",
    state: "Maharashtra",
    pincode: "400601",
    managerName: "Amit Verma",
    phone: "9898011223",
    capacityUnits: 25000,
    isDefault: false,
    totalItemsStored: 1820,
    totalValuation: 1120000,
    status: "active",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "g-03",
    name: "Cold Storage Unit 1 (Dairy & Pharma)",
    code: "CS-COLD-01",
    address: "Reefer Yard 2, MIDC Industrial Area",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411018",
    managerName: "Sanjay Patil",
    phone: "9766022334",
    capacityUnits: 15000,
    isDefault: false,
    totalItemsStored: 950,
    totalValuation: 890000,
    status: "active",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

const DEFAULT_SAMPLE_TRANSFERS: StockTransfer[] = [
  {
    id: "tr-01",
    transferNumber: "TR-2026-0042",
    date: "2026-08-19",
    sourceGodownId: "g-01",
    sourceGodownName: "Central Main Warehouse",
    destGodownId: "g-02",
    destGodownName: "North Branch Godown",
    productId: "item-01",
    productName: "Amul Butter Pasteurised (500g)",
    sku: "AML-BUT-500",
    batchNumber: "BATCH-D01",
    quantity: 20,
    unit: "PCS",
    transferredBy: "Rudra (Store Admin)",
    vehicleNumber: "MH-04-AB-1234",
    status: "completed",
    notes: "Replenish low branch stock",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "tr-02",
    transferNumber: "TR-2026-0043",
    date: "2026-08-20",
    sourceGodownId: "g-01",
    sourceGodownName: "Central Main Warehouse",
    destGodownId: "g-03",
    destGodownName: "Cold Storage Unit 1",
    productId: "item-05",
    productName: "Coca-Cola Original 300ml Can",
    sku: "COK-CAN-300",
    batchNumber: "BATCH-BV01",
    quantity: 50,
    unit: "CAN",
    transferredBy: "Rudra (Store Admin)",
    vehicleNumber: "MH-12-CD-5678",
    status: "in_transit",
    notes: "Temperature controlled dispatch",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "tr-03",
    transferNumber: "TR-2026-0044",
    date: "2026-08-21",
    sourceGodownId: "g-02",
    sourceGodownName: "North Branch Godown",
    destGodownId: "g-01",
    destGodownName: "Central Main Warehouse",
    productId: "item-03",
    productName: "Tata Salt Vacuum Evaporated (1kg)",
    sku: "TAT-SLT-1KG",
    batchNumber: "BATCH-GR01",
    quantity: 30,
    unit: "KG",
    transferredBy: "Amit Verma",
    vehicleNumber: "MH-04-XY-9999",
    status: "pending",
    notes: "Stock re-balancing",
    created_at: new Date().toISOString(),
  },
];

export default function GodownPage() {
  const { orgId } = useOrganization();
  const { user } = useAuth();

  const [godowns, setGodowns] = useState<Godown[]>(DEFAULT_SAMPLE_GODOWNS);
  const [transfers, setTransfers] = useState<StockTransfer[]>(DEFAULT_SAMPLE_TRANSFERS);
  const [activeTab, setActiveTab] = useState<"godowns" | "transfers" | "stock">("godowns");
  const [search, setSearch] = useState("");
  const [selectedGodownFilter, setSelectedGodownFilter] = useState("all");

  // Add / Edit Godown Modal
  const [showGodownModal, setShowGodownModal] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);
  const [godownName, setGodownName] = useState("");
  const [godownCode, setGodownCode] = useState("");
  const [godownAddress, setGodownAddress] = useState("");
  const [godownCity, setGodownCity] = useState("");
  const [godownState, setGodownState] = useState("");
  const [godownPincode, setGodownPincode] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [capacityUnits, setCapacityUnits] = useState("50000");

  // Transfer Stock Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [sourceGodownId, setSourceGodownId] = useState(godowns[0]?.id || "g-01");
  const [destGodownId, setDestGodownId] = useState(godowns[1]?.id || "g-02");
  const [transferItemName, setTransferItemName] = useState("Amul Butter Pasteurised (500g)");
  const [transferSku, setTransferSku] = useState("AML-BUT-500");
  const [transferBatch, setTransferBatch] = useState("BATCH-D01");
  const [transferQty, setTransferQty] = useState("10");
  const [transferUnit, setTransferUnit] = useState("PCS");
  const [transferVehicle, setTransferVehicle] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  // Fetch Locations from Supabase
  useEffect(() => {
    if (!orgId) return;

    const fetchLocations = async () => {
      try {
        const { data: locs, error } = await supabase
          .from("locations")
          .select("id, name, address, created_at, updated_at")
          .eq("organization_id", orgId);

        if (!error && locs && locs.length > 0) {
          const mapped: Godown[] = locs.map((l, i) => ({
            id: l.id,
            name: l.name,
            code: `WH-${l.name.slice(0, 3).toUpperCase()}-0${i + 1}`,
            address: l.address || "Local Store Facility",
            capacityUnits: 30000,
            isDefault: i === 0,
            totalItemsStored: 1500,
            totalValuation: 950000,
            status: "active",
            created_at: l.created_at,
          }));
          setGodowns(mapped);
        }
      } catch (err) {
        console.warn("Failed to load locations from Supabase:", err);
      }
    };

    fetchLocations();
  }, [orgId]);

  // Open Add/Edit Godown
  const handleOpenGodownModal = (g?: Godown) => {
    if (g) {
      setEditingGodown(g);
      setGodownName(g.name);
      setGodownCode(g.code);
      setGodownAddress(g.address || "");
      setGodownCity(g.city || "");
      setGodownState(g.state || "");
      setGodownPincode(g.pincode || "");
      setManagerName(g.managerName || "");
      setManagerPhone(g.phone || "");
      setCapacityUnits(g.capacityUnits?.toString() || "50000");
    } else {
      setEditingGodown(null);
      setGodownName("");
      setGodownCode(`WH-LOC-0${godowns.length + 1}`);
      setGodownAddress("");
      setGodownCity("Mumbai");
      setGodownState("Maharashtra");
      setGodownPincode("");
      setManagerName("");
      setManagerPhone("");
      setCapacityUnits("50000");
    }
    setShowGodownModal(true);
  };

  const handleSaveGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!godownName.trim()) {
      toast.error("Godown / Warehouse name is required.");
      return;
    }

    if (!orgId) {
      if (editingGodown) {
        setGodowns((prev) =>
          prev.map((g) =>
            g.id === editingGodown.id
              ? {
                  ...g,
                  name: godownName.trim(),
                  code: godownCode.trim(),
                  address: godownAddress.trim(),
                  city: godownCity.trim(),
                  state: godownState.trim(),
                  pincode: godownPincode.trim(),
                  managerName: managerName.trim(),
                  phone: managerPhone.trim(),
                  capacityUnits: parseInt(capacityUnits, 10) || 50000,
                }
              : g
          )
        );
        toast.success(`Updated warehouse "${godownName}"`);
      } else {
        const newG: Godown = {
          id: `g-loc-${Date.now()}`,
          name: godownName.trim(),
          code: godownCode.trim(),
          address: godownAddress.trim(),
          city: godownCity.trim(),
          state: godownState.trim(),
          pincode: godownPincode.trim(),
          managerName: managerName.trim(),
          phone: managerPhone.trim(),
          capacityUnits: parseInt(capacityUnits, 10) || 50000,
          isDefault: godowns.length === 0,
          totalItemsStored: 0,
          totalValuation: 0,
          status: "active",
          created_at: new Date().toISOString(),
        };
        setGodowns((prev) => [...prev, newG]);
        toast.success(`Created new warehouse "${godownName}"!`);
      }
      setShowGodownModal(false);
      return;
    }

    try {
      if (editingGodown) {
        await supabase
          .from("locations")
          .update({
            name: godownName.trim(),
            address: godownAddress.trim(),
          })
          .eq("id", editingGodown.id);
        toast.success(`Updated warehouse "${godownName}"`);
      } else {
        const { error } = await supabase.from("locations").insert({
          organization_id: orgId,
          name: godownName.trim(),
          address: godownAddress.trim(),
        });
        if (error) throw error;
        toast.success(`Created warehouse "${godownName}"!`);
      }
      setShowGodownModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save warehouse.");
    }
  };

  // Submit Stock Transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceGodownId === destGodownId) {
      toast.error("Source and Destination warehouses cannot be the same.");
      return;
    }

    const qty = parseFloat(transferQty) || 0;
    if (qty <= 0) {
      toast.error("Transfer quantity must be greater than 0.");
      return;
    }

    const sourceG = godowns.find((g) => g.id === sourceGodownId);
    const destG = godowns.find((g) => g.id === destGodownId);

    const newTransfer: StockTransfer = {
      id: `tr-${Date.now()}`,
      transferNumber: `TR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().slice(0, 10),
      sourceGodownId,
      sourceGodownName: sourceG?.name || "Source Godown",
      destGodownId,
      destGodownName: destG?.name || "Dest Godown",
      productId: `prod-${Date.now()}`,
      productName: transferItemName,
      sku: transferSku,
      batchNumber: transferBatch || "DEFAULT",
      quantity: qty,
      unit: transferUnit,
      transferredBy: user?.email ? user.email.split("@")[0] : "Store Admin",
      vehicleNumber: transferVehicle || undefined,
      status: "completed",
      notes: transferNotes || undefined,
      created_at: new Date().toISOString(),
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    toast.success(
      `Stock transfer of ${qty} ${transferUnit} from "${sourceG?.name}" to "${destG?.name}" executed successfully!`
    );
    setShowTransferModal(false);
  };

  // Summary Metrics
  const totalGodownsCount = godowns.length;
  const totalStockUnits = godowns.reduce((sum, g) => sum + (g.totalItemsStored || 0), 0);
  const totalValuationAll = godowns.reduce((sum, g) => sum + (g.totalValuation || 0), 0);
  const activeTransfersCount = transfers.filter((t) => t.status !== "completed").length;

  return (
    <div className="h-full flex flex-col p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* HEADER - Compact */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Godown &amp; Warehouse Hub
              </h1>
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0.2">
                {godowns.length} Facilities
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Multi-warehouse inventory tracking, batch storage distribution &amp; intra-godown stock transfers
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <Button
            onClick={() => setShowTransferModal(true)}
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs px-2.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Stock</span>
          </Button>

          <Button
            onClick={() => handleOpenGodownModal()}
            size="sm"
            className="h-8 gap-1.5 font-bold text-xs shadow-xs px-2.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Godown</span>
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* METRIC CARDS - Compact */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
        {/* Card 1: Total Godowns */}
        <div className="p-2.5 sm:p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Godowns
            </span>
            <p className="text-base sm:text-lg font-black text-foreground">{totalGodownsCount}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Operational facilities</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Warehouse className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Total Stock Stored */}
        <div className="p-2.5 sm:p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Units Stored
            </span>
            <p className="text-base sm:text-lg font-black text-foreground font-mono">
              {totalStockUnits.toLocaleString("en-IN")}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Across all warehouses</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
            <Package className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Total Stock Valuation */}
        <div className="p-2.5 sm:p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Valuation
            </span>
            <p className="text-base sm:text-lg font-black text-foreground font-mono">
              ₹ {totalValuationAll.toLocaleString("en-IN")}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Asset value in godowns</p>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Active Stock Transfers */}
        <div className="p-2.5 sm:p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Transfers
            </span>
            <p className="text-base sm:text-lg font-black text-blue-600 font-mono">
              {activeTransfersCount} Active
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Inter-branch logistics</p>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <Truck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION TABS: Godowns Grid vs Transfer History - Compact */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-border pb-2 gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border">
          {[
            { id: "godowns", label: `Warehouses (${godowns.length})` },
            { id: "transfers", label: `Stock Transfer Log (${transfers.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB PANELS - Fits Remaining Space */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
        {activeTab === "godowns" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {godowns.map((godown) => {
            const usagePercent = Math.min(
              100,
              Math.round(((godown.totalItemsStored || 0) / (godown.capacityUnits || 50000)) * 100)
            );

            return (
              <div
                key={godown.id}
                className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 shadow-sm space-y-4 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-sm">{godown.name}</h3>
                        {godown.isDefault && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase font-bold py-0">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {godown.code}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenGodownModal(godown)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Location & Contact Info */}
                  <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/60">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{godown.address || "Local Address"}</span>
                    </div>
                    {godown.managerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Mgr: {godown.managerName}</span>
                      </div>
                    )}
                    {godown.phone && (
                      <div className="flex items-center gap-2 font-mono">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{godown.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Capacity Utilization</span>
                      <span className="font-mono font-bold text-foreground">{usagePercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          usagePercent > 80
                            ? "bg-rose-500"
                            : usagePercent > 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Stored Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border font-mono text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-sans">
                        Items Stored
                      </p>
                      <p className="font-bold text-foreground">
                        {(godown.totalItemsStored || 0).toLocaleString("en-IN")} Units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-sans">
                        Valuation
                      </p>
                      <p className="font-bold text-foreground">
                        ₹ {(godown.totalValuation || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSourceGodownId(godown.id);
                      setShowTransferModal(true);
                    }}
                    className="w-full text-xs font-semibold gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Transfer Stock From Here
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: STOCK TRANSFERS LOG TABLE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "transfers" && (
        <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="font-bold text-foreground text-xs uppercase tracking-wider">
              Stock Transfer Records &amp; Waybills
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const csv = [
                  "Transfer ID,Date,Source Godown,Destination Godown,Product,SKU,Quantity,Unit,Vehicle,Status",
                  ...transfers.map((t) =>
                    [
                      t.transferNumber,
                      t.date,
                      t.sourceGodownName,
                      t.destGodownName,
                      t.productName,
                      t.sku,
                      t.quantity,
                      t.unit,
                      t.vehicleNumber || "",
                      t.status,
                    ].join(",")
                  ),
                ].join("\n");
                downloadCSV("CredSmart_Stock_Transfers.csv", csv);
                toast.success("Transfers export downloaded!");
              }}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Transfer No / Date</th>
                  <th className="px-4 py-3.5">Source Godown</th>
                  <th className="px-4 py-3.5">Destination Godown</th>
                  <th className="px-4 py-3.5">Item &amp; SKU</th>
                  <th className="px-4 py-3.5 text-right">Transfer QTY</th>
                  <th className="px-4 py-3.5">Transferred By</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono">
                      <p className="font-bold text-foreground text-xs">{t.transferNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{t.date}</p>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {t.sourceGodownName}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {t.destGodownName}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground">{t.productName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {t.sku} · Batch: {t.batchNumber || "DEFAULT"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                      {t.quantity} {t.unit}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {t.transferredBy}
                      {t.vehicleNumber && (
                        <span className="block text-[10px] font-mono">{t.vehicleNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {t.status === "completed" && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                          Completed
                        </Badge>
                      )}
                      {t.status === "in_transit" && (
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px]">
                          In Transit
                        </Badge>
                      )}
                      {t.status === "pending" && (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT GODOWN */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={showGodownModal} onOpenChange={setShowGodownModal}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Warehouse className="w-5 h-5 text-primary" />
              {editingGodown ? "Edit Godown Facility" : "Add New Warehouse / Godown"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveGodown} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Godown / Warehouse Name *</Label>
                <Input
                  placeholder="e.g. East Hub Godown"
                  value={godownName}
                  onChange={(e) => setGodownName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Facility Code</Label>
                <Input
                  placeholder="e.g. WH-EAST-01"
                  value={godownCode}
                  onChange={(e) => setGodownCode(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Address / Location</Label>
              <Input
                placeholder="Industrial Plot, Street, Sector..."
                value={godownAddress}
                onChange={(e) => setGodownAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input
                  placeholder="City"
                  value={godownCity}
                  onChange={(e) => setGodownCity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input
                  placeholder="State"
                  value={godownState}
                  onChange={(e) => setGodownState(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PIN Code</Label>
                <Input
                  placeholder="PIN"
                  value={godownPincode}
                  onChange={(e) => setGodownPincode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Manager Name</Label>
                <Input
                  placeholder="Person In-charge"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Phone</Label>
                <Input
                  placeholder="Phone Number"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Storage Capacity (Units)</Label>
              <Input
                type="number"
                placeholder="50000"
                value={capacityUnits}
                onChange={(e) => setCapacityUnits(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowGodownModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Facility
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: TRANSFER STOCK */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Transfer Stock Between Warehouses
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs pt-2">
            {/* Source and Destination */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-muted/20 border border-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Source Warehouse (From)</Label>
                <Select value={sourceGodownId} onValueChange={setSourceGodownId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {godowns.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination Warehouse (To)</Label>
                <Select value={destGodownId} onValueChange={setDestGodownId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {godowns.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product & Batch details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Item / Product Name *</Label>
                <Input
                  value={transferItemName}
                  onChange={(e) => setTransferItemName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SKU Code</Label>
                <Input
                  value={transferSku}
                  onChange={(e) => setTransferSku(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Batch Number</Label>
                <Input
                  value={transferBatch}
                  onChange={(e) => setTransferBatch(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transfer QTY *</Label>
                <Input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  required
                  min="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit</Label>
                <Input
                  value={transferUnit}
                  onChange={(e) => setTransferUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vehicle / Transit Ref No</Label>
                <Input
                  placeholder="e.g. MH-04-AB-1234"
                  value={transferVehicle}
                  onChange={(e) => setTransferVehicle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transfer Notes / Reason</Label>
                <Input
                  placeholder="e.g. Branch replenishment"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTransferModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Dispatch &amp; Transfer Stock
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
