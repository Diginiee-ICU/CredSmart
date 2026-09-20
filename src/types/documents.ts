export type SalesDocumentType =
  | "sales_invoice"
  | "quotation"
  | "payment_in"
  | "sales_return"
  | "credit_note"
  | "delivery_challan"
  | "proforma_invoice";

export type PurchaseDocumentType =
  | "purchase_invoice"
  | "payment_out"
  | "purchase_return"
  | "debit_note"
  | "purchase_order";

export type DocumentStatus =
  | "paid"
  | "partial"
  | "unpaid"
  | "overdue"
  | "draft"
  | "cancelled"
  | "received"
  | "sent"
  | "converted";

export interface DocumentLineItem {
  id: string;
  productId?: string;
  productName: string;
  barcode?: string;
  hsn?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;       // ALWAYS in primary units (e.g. PCS) — used for all calculations
  unit: string;           // primary unit label (e.g. "PCS")
  /** Alternate unit label used during billing, e.g. "PKT" */
  altUnit?: string;
  /** Qty entered in alternate units (e.g. 2 PKT). quantity = altQty × altUnitConversion */
  altQty?: number;
  /** Conversion factor: how many primary units per 1 alt unit (e.g. 4 PCS/PKT) */
  altUnitConversion?: number;
  rate: number;
  /** Tax pricing mode: "exclusive" (Without Tax, default) or "inclusive" (With Tax) */
  taxType?: "exclusive" | "inclusive";
  discountPercent: number;
  discountAmount: number;
  taxRate: number; // e.g. 0, 5, 12, 18, 28
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  returnReason?: string;
  maxReturnQty?: number;
  lineTotal: number;
}

export interface BusinessDocument {
  id: string;
  organizationId: string;
  docType: SalesDocumentType | PurchaseDocumentType;
  /** Default tax type for line items: "exclusive" (Without Tax) or "inclusive" (With Tax) */
  defaultTaxType?: "exclusive" | "inclusive";
  documentNumber: string;
  referenceNumber?: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  returnReason?: string;
  returnAction?: "return_to_stock" | "scrap_damaged";
  settlementMode?: "store_credit" | "cash_refund" | "upi_refund" | "bank_refund" | "unsettled";
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  partyEmail?: string;
  partyGstin?: string;
  partyAddress?: string;
  billingAddress?: string;
  billingPincode?: string;
  billingPlaceOfSupply?: string;
  placeOfSupply?: string; // State name / code, e.g. "27-Maharashtra"
  docDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  paymentTerms?: string; // "Due on Receipt" | "Net 7" | "Net 15" | "Net 30" | "Net 45" | "Net 60"
  items: DocumentLineItem[];
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: DocumentStatus;
  paymentMethod?: string; // "Cash" | "UPI" | "Card" | "Bank Transfer" | "Credit" | "Split" | "Cheque"
  notes?: string;
  terms?: string;
  convertedFromId?: string;
  convertedFromType?: string;
  transportDetails?: {
    vehicleNumber?: string;
    transporterName?: string;
    lrNumber?: string;
    dispatchDate?: string;
  };
  custom_fields?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface DocumentMetrics {
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  cancelledAmount: number;
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  cancelledCount: number;
}

export const INDIAN_STATES = [
  "01-Jammu and Kashmir",
  "02-Himachal Pradesh",
  "03-Punjab",
  "04-Chandigarh",
  "05-Uttarakhand",
  "06-Haryana",
  "07-Delhi",
  "08-Rajasthan",
  "09-Uttar Pradesh",
  "10-Bihar",
  "11-Sikkim",
  "12-Arunachal Pradesh",
  "13-Nagaland",
  "14-Manipur",
  "15-Mizoram",
  "16-Tripura",
  "17-Meghalaya",
  "18-Assam",
  "19-West Bengal",
  "20-Jharkhand",
  "21-Odisha",
  "22-Chhattisgarh",
  "23-Madhya Pradesh",
  "24-Gujarat",
  "26-Dadra & Nagar Haveli and Daman & Diu",
  "27-Maharashtra",
  "29-Karnataka",
  "30-Goa",
  "31-Lakshadweep",
  "32-Kerala",
  "33-Tamil Nadu",
  "34-Puducherry",
  "35-Andaman and Nicobar Islands",
  "36-Telangana",
  "37-Andhra Pradesh",
  "38-Ladakh",
  "97-Other Territory",
];

export const PAYMENT_TERMS_OPTIONS = [
  { label: "Due on Receipt", value: "Due on Receipt", days: 0 },
  { label: "Net 7 Days", value: "Net 7", days: 7 },
  { label: "Net 15 Days", value: "Net 15", days: 15 },
  { label: "Net 30 Days", value: "Net 30", days: 30 },
  { label: "Net 45 Days", value: "Net 45", days: 45 },
  { label: "Net 60 Days", value: "Net 60", days: 60 },
  { label: "Custom", value: "Custom", days: 0 },
];
