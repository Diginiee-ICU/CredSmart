export type InvoiceTheme = "stylish" | "luxury" | "advanced_gst" | "modern" | "classic";

export type InvoiceThemeStyling =
  | "uttarakhand"
  | "uttarakhand_2"
  | "jagganth"
  | "uttar_pradesh"
  | "maharashtra"
  | "gujarat";

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  accent: string;
  border: string;
  bgLight: string;
  textOnPrimary: string;
}

export const COLOR_SWATCHES: ColorSwatch[] = [
  { id: "black", name: "Black", hex: "#18181B", accent: "#27272A", border: "#3F3F46", bgLight: "#F4F4F5", textOnPrimary: "#FFFFFF" },
  { id: "green", name: "Forest Green", hex: "#15803D", accent: "#166534", border: "#86EFAC", bgLight: "#F0FDF4", textOnPrimary: "#FFFFFF" },
  { id: "royal_blue", name: "Royal Blue", hex: "#0284C7", accent: "#0369A1", border: "#7DD3FC", bgLight: "#F0F9FF", textOnPrimary: "#FFFFFF" },
  { id: "purple", name: "Royal Purple", hex: "#7C3AED", accent: "#6D28D9", border: "#C4B5FD", bgLight: "#F5F3FF", textOnPrimary: "#FFFFFF" },
  { id: "crimson_red", name: "Crimson Red", hex: "#BE123C", accent: "#9F1239", border: "#FDA4AF", bgLight: "#FFF1F2", textOnPrimary: "#FFFFFF" },
  { id: "navy", name: "Navy Blue", hex: "#1E3A8A", accent: "#172554", border: "#93C5FD", bgLight: "#EFF6FF", textOnPrimary: "#FFFFFF" },
  { id: "gold", name: "Royal Gold", hex: "#B45309", accent: "#92400E", border: "#FCD34D", bgLight: "#FFFBEB", textOnPrimary: "#FFFFFF" },
  { id: "orange", name: "Burnt Orange", hex: "#C2410C", accent: "#9A3412", border: "#FDBA74", bgLight: "#FFF7ED", textOnPrimary: "#FFFFFF" },
];

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface CustomColumn {
  id: string;
  label: string;
  key: string;
  defaultValue?: string;
}

export interface BankAccountDetails {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  accountHolder?: string;
  accountType?: "Current" | "Savings";
  isDefault?: boolean;
}

export interface InvoiceSettingsState {
  theme: InvoiceTheme;
  styling: InvoiceThemeStyling;
  primaryColor: string; // hex
  
  // Theme settings toggles
  showPartyBalance: boolean;
  enableFreeQty: boolean;
  showItemDescription: boolean;
  showAlternateUnit: boolean;
  showPhoneNumber: boolean;
  showTimestamp: boolean;
  priceHistory: boolean;
  autoApplyLuxury: boolean;

  // Invoice Details
  industryType: string;
  showPoNumber: boolean;
  poNumber: string;
  showEwayBill: boolean;
  ewayBillNumber: string;
  showVehicleNumber: boolean;
  vehicleNumber: string;
  invoiceCustomFields: CustomField[];

  // Party Details
  partyCustomFields: CustomField[];

  // Item Table Columns
  columns: {
    pricePerItem: boolean;
    quantity: boolean;
    batchNo: boolean;
    expDate: boolean;
    mfgDate: boolean;
    customColumns: CustomColumn[];
  };

  // Miscellaneous Details
  selectedBankAccountId: string;
  bankAccounts: BankAccountDetails[];
  selectedPaymentQrUpi: string;
  termsAndConditionsType: "Sales Invoices" | "Quotations" | "Delivery Challans";
  termsAndConditions: Record<string, string>;
  signatureMode: "upload" | "draw" | "default" | "none";
  signatureDataUrl: string;
  signatoryTitle: string;
}

export interface BusinessSettingsState {
  businessName: string;
  phone: string;
  email: string;
  billingAddress: string;
  state: string;
  pincode: string;
  city: string;
  isGstRegistered: boolean;
  gstin: string;
  pan: string;
  businessTypes: string[]; // Retailer, Wholesaler, Distributor, Manufacturer, Services
  industryType: string;
  businessRegistrationType: string;
  logoUrl: string;
  signatureDataUrl: string;
  signatoryTitle: string;
  
  // Additional Business Details
  msmeNumber: string;
  website: string;
  upiId: string;
  bankAccounts: BankAccountDetails[];
  customDetails: CustomField[];
}

export const INDIAN_STATES = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

export const BUSINESS_TYPES = [
  "Retailer",
  "Wholesaler",
  "Distributor",
  "Manufacturer",
  "Services",
];

export const INDUSTRY_TYPES = [
  "Other services",
  "FMCG / Grocery / Supermarket",
  "Electronics & Home Appliances",
  "Apparel / Footwear / Garments",
  "Pharma / Healthcare / Medical",
  "Automobiles & Spare Parts",
  "Hardware & Sanitary / Construction",
  "Restaurant / Café / Bakery",
  "Books & Stationery",
  "Jewellery & Gems",
  "Agriculture & Seeds / Fertilizers",
  "IT / Software / Consulting",
  "Logistics & Transportation",
  "Cosmetics & Salon",
  "Education & Coaching",
];

export const REGISTRATION_TYPES = [
  "Proprietorship",
  "Partnership Firm",
  "Private Limited Company (Pvt. Ltd.)",
  "Public Limited Company (Ltd.)",
  "Limited Liability Partnership (LLP)",
  "One Person Company (OPC)",
  "Hindu Undivided Family (HUF)",
  "Society / Trust / Club / NGO",
];
