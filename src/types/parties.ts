export type PartyType = "customer" | "supplier" | "both";

export type PartyCategory =
  | "Retailer"
  | "Wholesaler"
  | "Distributor"
  | "Manufacturer"
  | "End Consumer"
  | "Vendor"
  | "General";

export interface CustomPartyField {
  key: string;
  label: string;
  value: string;
}

export interface PartyCustomItem {
  productId: string;
  productName: string;
  category?: string;
  brand?: string | null;
  sku?: string;
  barcode?: string | null;
  unit?: string;
  altUnit?: string | null;
  altUnitConversion?: number | null;
  standardPrice: number;
  customPrice: number;
  costPrice?: number;
  gstRate?: number;
  hsnCode?: string;
  customStock?: number;
  minStockAlert?: number;
  notes?: string;
  isActive?: boolean;
}

export interface Party {
  id: string;
  organization_id?: string;
  name: string;
  tradeName?: string;
  phone: string | null;
  email: string | null;
  partyType: PartyType;
  category: string;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  shippingAddress?: string | null;
  openingBalance: number;
  balance: number; // Positive = Receivable (To Collect, Dr), Negative = Payable (To Pay, Cr), 0 = Settled
  creditLimit?: number | null;
  creditPeriodDays?: number | null;
  customFields?: Record<string, any>;
  keepSamePrice?: boolean; // Default true: uses standard catalogue prices. If false: uses party-specific custom prices
  keepSameInventory?: boolean; // Default true: allows all catalogue products. If false: only customItems are allowed
  customItems?: PartyCustomItem[];
  sharedLedgerEnabled?: boolean;
  sharedLedgerStatus?: "synced" | "pending" | "invited" | "unlinked";
  sharedLedgerCode?: string;
  created_at: string;
  updated_at?: string;
}

export interface SharedLedgerInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  type: "sale" | "purchase";
  amount: number;
  balanceDue: number;
  status: "matched" | "unmatched" | "disputed";
  notes?: string;
}

export interface SharedLedgerProfile {
  partyId: string;
  partyName: string;
  partyType: PartyType;
  phone: string | null;
  gstin: string | null;
  syncStatus: "connected" | "syncing" | "pending_invitation" | "offline";
  lastSyncedAt: string;
  sharedMagicLink: string;
  invoicesCount: number;
  totalVolume: number;
  matchedBalance: number;
  discrepancyAmount: number;
}
