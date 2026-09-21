import { DocumentLineItem } from "./documents";

export type NetworkInvoiceStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface NetworkInvoice {
  id: string;
  senderOrgId: string;
  senderOrgName: string;
  senderOrgPhone?: string;
  senderOrgEmail?: string;
  senderOrgGstin?: string;
  senderOrgAddress?: string;
  senderUserId?: string;
  senderUserName?: string;
  
  recipientOrgId?: string;
  recipientOrgName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientGstin?: string;
  recipientAddress?: string;

  invoiceNumber: string;
  docDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  paymentTerms?: string;
  paymentMethod?: string;
  
  items: DocumentLineItem[];
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  roundOff?: number;
  grandTotal: number;
  notes?: string;
  terms?: string;

  status: NetworkInvoiceStatus;
  purchaseInvoiceId?: string;
  purchaseInvoiceNumber?: string;
  rejectionReason?: string;
  
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  rejected_at?: string;
}

export type NetworkNotificationType =
  | "sale_invoice_received"
  | "sale_invoice_approved"
  | "sale_invoice_rejected"
  | "sale_invoice_cancelled"
  | "low_stock_alert"
  | "payment_due_alert"
  | "risk_radar_alert"
  | "compliance_alert"
  | "system_alert";

export type AlertCategory =
  | "all"
  | "inward"
  | "inventory"
  | "payments"
  | "risk"
  | "compliance"
  | "system";

export interface NetworkNotification {
  id: string;
  recipientOrgId: string;
  recipientOrgName?: string;
  recipientPhone?: string;
  recipientGstin?: string;
  recipientUserId?: string;
  type: NetworkNotificationType;
  category?: AlertCategory;
  title: string;
  message: string;
  status: "unread" | "read";
  actionStatus: NetworkInvoiceStatus;
  networkInvoiceId?: string;
  actionUrl?: string;
  actionLabel?: string;
  data?: {
    senderOrgId?: string;
    senderOrgName?: string;
    senderOrgGstin?: string;
    senderOrgPhone?: string;
    recipientPartyName?: string;
    recipientPhone?: string;
    recipientGstin?: string;
    invoiceNumber?: string;
    grandTotal?: number;
    itemsCount?: number;
    docDate?: string;
    purchaseInvoiceNumber?: string;
    productId?: string;
    productName?: string;
    currentStock?: number;
    minStockAlert?: number;
    partyId?: string;
    partyName?: string;
    amountDue?: number;
    daysOverdue?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface ConnectedOrgInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  businessType?: string;
  isRegisteredOnPlatform: boolean;
}
