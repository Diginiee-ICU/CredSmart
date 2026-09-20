export type EwaySupplyType = "O" | "I"; // O = Outward, I = Inward

export type EwaySubSupplyType =
  | "1" // Supply
  | "2" // Import
  | "3" // Export
  | "4" // Job Work
  | "5" // For Own Use
  | "6" // Job Work Return
  | "7" // Sales Return
  | "8" // Others
  | "9" // SKD/CKD
  | "10" // Line Sales
  | "11" // Recipient Not Known
  | "12"; // Exhibition or Fairs

export type EwayDocType = "INV" | "BIL" | "BOE" | "CHL" | "OTH";

export type EwayTransMode = "1" | "2" | "3" | "4"; // 1 = Road, 2 = Rail, 3 = Air, 4 = Ship

export type EwayVehicleType = "R" | "O"; // R = Regular, O = Over Dimensional Cargo

export type EwayBillStatus = "active" | "part_a_only" | "cancelled" | "expired";

export interface EwayItem {
  id?: string;
  productName: string;
  productDesc?: string;
  hsnCode: string;
  quantity: number;
  qtyUnit: string;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate?: number;
  cessAmount?: number;
}

export interface EwayVehicleHistory {
  vehicleNo: string;
  fromPlace: string;
  fromState: string;
  transMode: EwayTransMode;
  transDocNo?: string;
  transDocDate?: string;
  reasonCode: string; // e.g. "1 - Transshipment", "2 - Vehicle Breakdown"
  reasonRemarks?: string;
  updatedAt: string;
}

export interface EwayBillRecord {
  id: string;
  organizationId: string;
  ewayBillNo: string;
  ewayBillDate: string; // ISO String
  validUpto: string; // ISO String
  status: EwayBillStatus;

  // Document Info
  invoiceId?: string;
  docType: EwayDocType;
  docNo: string;
  docDate: string; // YYYY-MM-DD
  supplyType: EwaySupplyType;
  subSupplyType: EwaySubSupplyType;
  subSupplyDesc?: string;

  // Consignor (From) Details
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromPlace: string;
  fromPincode: string;
  fromStateCode: string;

  // Consignee (To) Details
  toGstin: string;
  toTrdName: string;
  toAddr1: string;
  toPlace: string;
  toPincode: string;
  toStateCode: string;

  // Financials & Items
  totalValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  cessValue: number;
  totInvValue: number;
  itemList: EwayItem[];

  // Transport Details (Part-B)
  transMode: EwayTransMode;
  transDistance: number; // in KM
  transporterId?: string; // 15-char TRANSIN or GSTIN
  transporterName?: string;
  transDocNo?: string; // LR / RR / Airway Bill No
  transDocDate?: string;
  vehicleNo?: string; // e.g. MH12AB1234
  vehicleType: EwayVehicleType;

  // Audit & History
  vehicleHistory?: EwayVehicleHistory[];
  cancelReason?: string;
  cancelRemarks?: string;
  cancelledAt?: string;
  qrCodeText?: string;
  created_at: string;
  updated_at?: string;
}

/** Official Government JSON Schema for bulk upload to ewaybillgst.gov.in */
export interface EwayGovernmentJsonPayload {
  version: "1.0.0421";
  billLists: Array<{
    userGstin: string;
    supplyType: EwaySupplyType;
    subSupplyType: EwaySubSupplyType;
    subSupplyDesc?: string;
    docType: EwayDocType;
    docNo: string;
    docDate: string; // DD/MM/YYYY
    fromGstin: string;
    fromTrdName: string;
    fromAddr1: string;
    fromAddr2?: string;
    fromPlace: string;
    fromPincode: number;
    actFromStateCode: number;
    fromStateCode: number;
    toGstin: string;
    toTrdName: string;
    toAddr1: string;
    toAddr2?: string;
    toPlace: string;
    toPincode: number;
    actToStateCode: number;
    toStateCode: number;
    totalValue: number;
    cgstValue: number;
    sgstValue: number;
    igstValue: number;
    cessValue: number;
    totInvValue: number;
    transMode: EwayTransMode;
    transDistance: number;
    transporterId?: string;
    transporterName?: string;
    transDocNo?: string;
    transDocDate?: string; // DD/MM/YYYY
    vehicleNo?: string;
    vehicleType: EwayVehicleType;
    itemList: Array<{
      itemNo: number;
      productName: string;
      productDesc: string;
      hsnCode: number;
      quantity: number;
      qtyUnit: string;
      cgstRate: number;
      sgstRate: number;
      igstRate: number;
      cessRate: number;
      taxableAmount: number;
    }>;
  }>;
}
