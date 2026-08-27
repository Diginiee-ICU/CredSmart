export type ItemUnit =
  | "PCS"
  | "KG"
  | "LTR"
  | "BOX"
  | "NOS"
  | "MTR"
  | "PKT"
  | "DOZ"
  | "BAG"
  | "CAN"
  | "BTL"
  | "SET"
  | "GM"
  | "ML"
  | "STEPS"
  | "steps"
  | "Steps";

export type GSTRate = 0 | 0.1 | 0.25 | 3 | 5 | 12 | 18 | 28;

export interface ItemBatch {
  id: string;
  productId: string;
  batchNumber: string;
  mrp: number;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  locationId?: string | null;
  locationName?: string;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
}

export interface InventoryItem {
  id: string;
  organization_id?: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  brand: string | null;
  unit: ItemUnit;
  /** Alternate (secondary) unit name, e.g. "PKT", "BOX", "DOZ" */
  altUnit?: string | null;
  /** How many primary units equal 1 alternate unit. e.g. 4 (PCS per PKT) */
  altUnitConversion?: number | null;
  sellingPrice: number;
  purchasePrice: number;
  mrp: number;
  gstRate: GSTRate;
  hsnCode: string | null;
  cessRate?: number;
  currentStock: number;
  openingStock: number;
  minStockAlert: number;
  godownId?: string | null;
  godownName?: string;
  imageUrl?: string | null;
  isLowStock: boolean;
  batches: ItemBatch[];
  tags?: Record<string, any> | null;
  created_at: string;
  updated_at?: string;
}

export interface Godown {
  id: string;
  organization_id?: string;
  name: string;
  code: string;
  address: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  managerName?: string;
  phone?: string;
  capacityUnits?: number;
  isDefault?: boolean;
  totalItemsStored?: number;
  totalValuation?: number;
  status: "active" | "inactive" | "maintenance";
  created_at: string;
  updated_at?: string;
}

export interface StockTransfer {
  id: string;
  organization_id?: string;
  transferNumber: string;
  date: string;
  sourceGodownId: string;
  sourceGodownName: string;
  destGodownId: string;
  destGodownName: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber?: string;
  quantity: number;
  unit: string;
  transferredBy: string;
  vehicleNumber?: string;
  status: "completed" | "in_transit" | "pending" | "cancelled";
  notes?: string;
  created_at: string;
}

export interface ItemOffer {
  id: string;
  title: string;
  description?: string;
  offerType: "percentage" | "flat" | "bogo" | "bundle";
  discountValue: number;
  appliedCategories: string[];
  appliedProductIds: string[];
  minOrderValue?: number;
  startDate: string;
  endDate: string;
  couponCode?: string;
  isActive: boolean;
  created_at: string;
}
