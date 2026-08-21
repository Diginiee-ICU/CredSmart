import { InvoiceSettingsState, COLOR_SWATCHES } from "@/types/invoice-settings";

export const INVOICE_SETTINGS_STORAGE_KEY = "credsmart_invoice_settings";

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettingsState = {
  theme: "stylish",
  styling: "uttarakhand_2",
  primaryColor: "#0284C7", // Royal Blue default
  showPartyBalance: true,
  enableFreeQty: false,
  showItemDescription: true,
  showAlternateUnit: false,
  showPhoneNumber: true,
  showTimestamp: true,
  priceHistory: false,
  autoApplyLuxury: true,

  industryType: "Other services",
  showPoNumber: false,
  poNumber: "PO-2026-902",
  showEwayBill: false,
  ewayBillNumber: "EWB-881920391",
  showVehicleNumber: false,
  vehicleNumber: "UK-07-AB-4491",
  invoiceCustomFields: [],

  partyCustomFields: [],

  columns: {
    pricePerItem: true,
    quantity: true,
    batchNo: false,
    expDate: false,
    mfgDate: false,
    customColumns: [],
  },

  selectedBankAccountId: "bank_1",
  bankAccounts: [
    {
      id: "bank_1",
      bankName: "HDFC Bank Ltd.",
      accountNumber: "50200084920194",
      ifsc: "HDFC0001429",
      branch: "Rajpur Road Branch",
      isDefault: true,
    },
    {
      id: "bank_2",
      bankName: "State Bank of India",
      accountNumber: "30491029384",
      ifsc: "SBIN0000624",
      branch: "Clock Tower Branch",
      isDefault: false,
    },
  ],
  selectedPaymentQrUpi: "credsmart@hdfcbank",
  termsAndConditionsType: "Sales Invoices",
  termsAndConditions: {
    "Sales Invoices":
      "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.\n3. Interest @ 18% p.a. will be charged if bill is not paid on due date.\n4. This is a computer generated invoice.",
    "Quotations":
      "1. Quotation valid for 15 days from the date of issue.\n2. 50% advance along with confirmed purchase order.\n3. Delivery within 7 working days from date of advance payment.",
    "Delivery Challans":
      "1. Goods delivered in good condition and subject to customer verification on receipt.\n2. Retain copy for invoice reconciliation.",
  },
  signatureMode: "default",
  signatureDataUrl: "",
  signatoryTitle: "Authorized Signatory",
};

export function loadInvoiceSettings(): InvoiceSettingsState {
  try {
    const saved = localStorage.getItem(INVOICE_SETTINGS_STORAGE_KEY);
    if (!saved) return DEFAULT_INVOICE_SETTINGS;
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_INVOICE_SETTINGS,
      ...parsed,
      columns: {
        ...DEFAULT_INVOICE_SETTINGS.columns,
        ...(parsed.columns || {}),
      },
    };
  } catch (e) {
    console.warn("Failed to load invoice settings from storage, using defaults:", e);
    return DEFAULT_INVOICE_SETTINGS;
  }
}

export function getThemeColorSwatch(hexColor?: string) {
  const target = (hexColor || DEFAULT_INVOICE_SETTINGS.primaryColor).toLowerCase();
  return (
    COLOR_SWATCHES.find((s) => s.hex.toLowerCase() === target) || {
      id: "royal_blue",
      name: "Royal Blue",
      hex: "#0284C7",
      accent: "#0369A1",
      border: "#7DD3FC",
      bgLight: "#F0F9FF",
      textOnPrimary: "#FFFFFF",
    }
  );
}
