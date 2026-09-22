import * as XLSX from "xlsx";
import { InventoryItem, GSTRate } from "@/types/inventory";
import { Party } from "@/types/parties";
import {
  parseTallyXml,
  TallyVoucher,
} from "./tallyXmlParser";
import { inspectUploadedFolder } from "./folderReader";

// ─── Supported Software Definitions ──────────────────────────────────────────

export type SupportedSoftware =
  | "auto"
  | "tally"
  | "vyapar"
  | "mybillbook"
  | "busy"
  | "marg"
  | "zoho"
  | "custom";

export interface SoftwareProfile {
  id: SupportedSoftware;
  name: string;
  shortName: string;
  tagline: string;
  color: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  badge: string;
  supportedFormats: string[];
  supportedEntities: string[];
  exportGuide: {
    title: string;
    steps: string[];
    shortcut?: string;
  };
}

export const SOFTWARE_PROFILES: Record<SupportedSoftware, SoftwareProfile> = {
  auto: {
    id: "auto",
    name: "Auto-Detect (Smart)",
    shortName: "Auto-Detect",
    tagline: "Drop any Excel, CSV, or Tally XML file. We automatically recognize the software.",
    color: "from-amber-500 via-amber-600 to-orange-600",
    borderColor: "border-amber-400/50",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-800 dark:text-amber-300",
    badge: "AI Powered",
    supportedFormats: [".xml", ".xlsx", ".xls", ".csv"],
    supportedEntities: ["All Supported Entities"],
    exportGuide: {
      title: "Universal Auto-Detect",
      steps: [
        "Export any items list, customer ledger, or balance sheet from your existing software.",
        "Drag and drop the exported file (.xlsx, .csv, or .xml) here.",
        "CredSmart will automatically identify the software and extract your items, parties, and opening balances.",
      ],
    },
  },
  tally: {
    id: "tally",
    name: "Tally Prime & ERP 9",
    shortName: "Tally",
    tagline: "Complete master migration: Stock Items, Ledgers, Bank/Cash, and Vouchers.",
    color: "from-blue-600 to-indigo-700",
    borderColor: "border-blue-400/50",
    badgeBg: "bg-blue-100 dark:bg-blue-950/60",
    badgeText: "text-blue-800 dark:text-blue-300",
    badge: "Full Backup",
    supportedFormats: [".xml", ".csv", ".xlsx"],
    supportedEntities: ["Stock Items", "Debtors & Creditors", "Bank Accounts", "Cash in Hand", "Daybook Vouchers"],
    exportGuide: {
      title: "Export from Tally Prime / ERP 9",
      shortcut: "Alt + E > XML",
      steps: [
        "Open Tally > Go to Gateway of Tally > Display More Reports > List of Accounts.",
        "Press Alt + E (Export) > Master > File Format: Select 'XML (Data Interchange)'.",
        "Set 'All Masters' to Yes, then click Send / Export.",
        "Upload the generated XML file here.",
      ],
    },
  },
  vyapar: {
    id: "vyapar",
    name: "Vyapar App",
    shortName: "Vyapar",
    tagline: "Seamlessly import Items with stock, pricing, and full Customer/Supplier Ledgers.",
    color: "from-rose-500 via-rose-600 to-pink-600",
    borderColor: "border-rose-400/50",
    badgeBg: "bg-rose-100 dark:bg-rose-950/60",
    badgeText: "text-rose-800 dark:text-rose-300",
    badge: "1-Click Excel",
    supportedFormats: [".xlsx", ".xls", ".csv"],
    supportedEntities: ["Items Catalog", "Stock & MRP", "Party Contacts", "Customer Udhar Balances", "Vendor Payables"],
    exportGuide: {
      title: "Export from Vyapar (Desktop or Mobile)",
      steps: [
        "Open Vyapar > Go to Items Master (or Reports > Item Report).",
        "Click the Excel/Spreadsheet icon on the top right to download 'All Items List'.",
        "Go to Parties > Click the Excel icon to download 'Party Statement / All Parties'.",
        "Drag and drop either or both files here for 1-click import.",
      ],
    },
  },
  mybillbook: {
    id: "mybillbook",
    name: "myBillBook",
    shortName: "myBillBook",
    tagline: "Import Product Catalog, Barcodes, Customer Udhar, and Vendor Khata.",
    color: "from-emerald-500 via-teal-600 to-cyan-700",
    borderColor: "border-emerald-400/50",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    badge: "Fast Excel",
    supportedFormats: [".xlsx", ".xls", ".csv"],
    supportedEntities: ["Items & Barcodes", "Batch & Expiry", "Parties List", "Opening Receivables / Payables"],
    exportGuide: {
      title: "Export from myBillBook",
      steps: [
        "Login to myBillBook Web or App > Navigate to 'Items'.",
        "Click 'Bulk Actions' or the Download Icon > 'Export Items to Excel'.",
        "Navigate to 'Parties' > Click 'Export Parties to Excel'.",
        "Upload the exported .xlsx or .csv files directly into CredSmart.",
      ],
    },
  },
  busy: {
    id: "busy",
    name: "Busy Accounting (BusyWin)",
    shortName: "Busy",
    tagline: "Migrate Item Master, Groups, Sundry Debtors, and Creditors with Dr/Cr balances.",
    color: "from-amber-600 via-orange-600 to-red-600",
    borderColor: "border-amber-400/50",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-800 dark:text-amber-300",
    badge: "Item & Account Master",
    supportedFormats: [".xlsx", ".xls", ".csv", ".xml"],
    supportedEntities: ["Item Master", "Opening Stock", "Sundry Debtors", "Sundry Creditors", "GSTIN & State"],
    exportGuide: {
      title: "Export from BusyWin (18 / 21)",
      shortcut: "Print / Export > MS Excel",
      steps: [
        "In Busy, go to Display > Account Books > Account Master / Item Master.",
        "Click 'Export (Alt + P)' > Choose Format: 'MS Excel' or 'XML'.",
        "Select fields: Name, Op. Balance, GSTIN, Address, Phone, Rate.",
        "Drop the exported file here to import in seconds.",
      ],
    },
  },
  marg: {
    id: "marg",
    name: "Marg ERP 9+",
    shortName: "Marg ERP",
    tagline: "Specialized Pharma & Retail migration: Products, Packing, MRP, and Ledgers.",
    color: "from-purple-600 to-indigo-800",
    borderColor: "border-purple-400/50",
    badgeBg: "bg-purple-100 dark:bg-purple-950/60",
    badgeText: "text-purple-800 dark:text-purple-300",
    badge: "Pharma / Retail",
    supportedFormats: [".xlsx", ".xls", ".csv"],
    supportedEntities: ["Product Master", "Packing & Units", "MRP & Cost", "Ledger Masters", "Debit/Credit Balances"],
    exportGuide: {
      title: "Export from Marg ERP 9+",
      steps: [
        "In Marg, go to Reports > Master Reports > Print / Export Master.",
        "Choose 'Product Master' or 'Ledger Master' > Select 'Export to Excel'.",
        "Save the Excel file to your computer.",
        "Upload here to automatically map all pharma / FMCG items and party balances.",
      ],
    },
  },
  zoho: {
    id: "zoho",
    name: "Zoho Books",
    shortName: "Zoho Books",
    tagline: "Import Items, Contacts (Customers & Vendors), and Chart of Accounts.",
    color: "from-red-600 via-rose-600 to-orange-600",
    borderColor: "border-red-400/50",
    badgeBg: "bg-red-100 dark:bg-red-950/60",
    badgeText: "text-red-800 dark:text-red-300",
    badge: "Cloud Books",
    supportedFormats: [".csv", ".xlsx"],
    supportedEntities: ["Items", "Usage Units", "Customers", "Vendors", "Opening Balances"],
    exportGuide: {
      title: "Export from Zoho Books",
      steps: [
        "Open Zoho Books > Go to Items > Click the Hamburger Menu > 'Export Items' (CSV).",
        "Go to Contacts > Click the Hamburger Menu > 'Export Contacts' (CSV).",
        "Upload the CSV files here to migrate your data in 1 click.",
      ],
    },
  },
  custom: {
    id: "custom",
    name: "Custom Excel / CSV",
    shortName: "Custom Excel",
    tagline: "Upload any standard spreadsheet. Smart column mapping handles the rest.",
    color: "from-slate-600 via-slate-700 to-slate-800",
    borderColor: "border-slate-400/50",
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-800 dark:text-slate-200",
    badge: "Universal",
    supportedFormats: [".xlsx", ".xls", ".csv"],
    supportedEntities: ["Items / Products", "Customers & Suppliers"],
    exportGuide: {
      title: "Custom Spreadsheet Guidelines",
      steps: [
        "Ensure your spreadsheet contains column headers like 'Item Name', 'Price', 'Stock', 'Phone', etc.",
        "You can download CredSmart's sample Excel template for best results.",
        "Upload and review the automatically extracted records in the preview tab.",
      ],
    },
  },
};

// ─── Normalized Result Interface ─────────────────────────────────────────────

export interface UniversalImportData {
  sourceSoftware: SupportedSoftware;
  detectedSoftware: SupportedSoftware;
  detectedEntityTypes: ("items" | "parties" | "bank" | "vouchers")[];
  companyName?: string;
  companyGstin?: string;
  folderName?: string;
  isRawTallyFolder?: boolean;
  items: Partial<InventoryItem>[] ;
  parties: {
    customers: Partial<Party>[];
    suppliers: Partial<Party>[];
    all: Partial<Party>[];
  };
  bankAccounts: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    balance: number;
  }[];
  cashInHand: number;
  vouchers: TallyVoucher[];
  summary: {
    totalItems: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalParties: number;
    totalOpeningReceivable: number;
    totalOpeningPayable: number;
    totalBankAccounts: number;
    totalVouchers: number;
  };
  warnings: string[];
  fileNames: string[];
}

// ─── Helpers: Header Normalizer ──────────────────────────────────────────────

function cleanHeader(val: unknown): string {
  if (!val) return "";
  return String(val).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColIndex(row: unknown[], keywords: string[]): number {
  if (!Array.isArray(row)) return -1;
  const normalized = row.map(cleanHeader);
  for (let i = 0; i < normalized.length; i++) {
    for (const k of keywords) {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalized[i].includes(cleanK)) return i;
    }
  }
  return -1;
}

function parseNum(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? fallback : n;
}

function sanitizeGstRate(val: unknown): GSTRate {
  const n = parseNum(val, 18);
  const valid: GSTRate[] = [0, 0.1, 0.25, 3, 5, 12, 18, 28];
  return (valid.includes(n as GSTRate) ? n : 18) as GSTRate;
}

function mapUnit(raw: unknown): string {
  const u = String(raw || "").toUpperCase().trim();
  const map: Record<string, string> = {
    NOS: "NOS", PCS: "PCS", PIECES: "PCS", PC: "PCS",
    KG: "KG", KGS: "KG", KILOGRAM: "KG",
    LTR: "LTR", L: "LTR", LITRE: "LTR", LITRES: "LTR",
    BOX: "BOX", BOXES: "BOX",
    PKT: "PKT", PACKET: "PKT", PACK: "PKT",
    MTR: "MTR", M: "MTR", METER: "MTR",
    BAG: "BAG", BAGS: "BAG",
    CAN: "CAN", BTL: "BTL", BOTTLE: "BTL",
    GM: "GM", GMS: "GM", GRAM: "GM",
    ML: "ML", DOZ: "DOZ", DOZEN: "DOZ",
  };
  return map[u] || "PCS";
}

// ─── File to Table Rows Loader ───────────────────────────────────────────────

export interface ParsedSheet {
  sheetName: string;
  rows: (string | number | null | undefined)[][];
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return await file.text();
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

async function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return await file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseFileToSheets(file: File): Promise<ParsedSheet[]> {
  const filename = file.name.toLowerCase();

  // 1. If XML file, return raw text in a synthetic sheet
  if (filename.endsWith(".xml")) {
    const text = await readFileText(file);
    return [{ sheetName: "XML_DATA", rows: [[text]] }];
  }

  // 2. If CSV or TXT, parse lines
  if (filename.endsWith(".csv") || filename.endsWith(".txt")) {
    const text = await readFileText(file);
    const workbook = XLSX.read(text, { type: "string" });
    const sheets: ParsedSheet[] = [];
    workbook.SheetNames.forEach((name) => {
      const ws = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(ws, {
        header: 1,
        defval: "",
        blankrows: false,
      });
      sheets.push({ sheetName: name, rows });
    });
    return sheets;
  }

  // 3. If Excel (.xlsx, .xls)
  const buffer = await readFileArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets: ParsedSheet[] = [];

  workbook.SheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });
    sheets.push({ sheetName: name, rows });
  });

  return sheets;
}

// ─── Software Signature Detector ─────────────────────────────────────────────

export function detectSoftwareFromSheets(
  sheets: ParsedSheet[],
  file: File
): SupportedSoftware {
  const filename = file.name.toLowerCase();

  // XML is always Tally in this context
  if (filename.endsWith(".xml")) {
    return "tally";
  }

  // Inspect first 8 rows of each sheet for signatures
  for (const sheet of sheets) {
    const sampleRows = sheet.rows.slice(0, 8);
    const joined = sampleRows
      .map((r) => (Array.isArray(r) ? r.join(" ").toLowerCase() : ""))
      .join(" ");

    // 1. Tally signatures
    if (joined.includes("<stockitem") || joined.includes("<ledger") || joined.includes("tally")) {
      return "tally";
    }

    // 2. Vyapar signatures
    if (
      joined.includes("measuring unit") ||
      joined.includes("item report") ||
      joined.includes("vyapar") ||
      (joined.includes("sale price") && joined.includes("stock value")) ||
      (joined.includes("receivable balance") && joined.includes("payable balance"))
    ) {
      return "vyapar";
    }

    // 3. myBillBook signatures
    if (
      joined.includes("mybillbook") ||
      joined.includes("low stock warning") ||
      (joined.includes("sales price") && joined.includes("opening stock") && joined.includes("to receive")) ||
      (joined.includes("balance type") && joined.includes("to receive"))
    ) {
      return "mybillbook";
    }

    // 4. BusyWin signatures
    if (
      joined.includes("busy") ||
      joined.includes("sundry debtors") ||
      joined.includes("sundry creditors") ||
      (joined.includes("op. qty") && joined.includes("sales price")) ||
      joined.includes("tax category")
    ) {
      return "busy";
    }

    // 5. Marg ERP signatures
    if (
      joined.includes("marg") ||
      (joined.includes("cost rate") && joined.includes("sale rate") && joined.includes("packing")) ||
      (joined.includes("company") && joined.includes("packing") && joined.includes("mrp"))
    ) {
      return "marg";
    }

    // 6. Zoho Books signatures
    if (
      joined.includes("zoho") ||
      joined.includes("usage unit") ||
      joined.includes("gst treatment") ||
      joined.includes("contact type")
    ) {
      return "zoho";
    }
  }

  return "custom";
}

// ─── Sheet Content Type Detector ─────────────────────────────────────────────

function detectSheetContentType(
  rows: (string | number | null | undefined)[][]
): "items" | "parties" | "unknown" {
  if (rows.length < 2) return "unknown";

  // Find header row (usually row 0, 1, or 2)
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const headerRow = rows[r];
    if (!Array.isArray(headerRow)) continue;
    const line = headerRow.map(cleanHeader).join(" ");

    // Item indicators
    const hasItemKeys =
      line.includes("itemname") ||
      line.includes("productname") ||
      line.includes("item") ||
      line.includes("product") ||
      line.includes("sku") ||
      line.includes("saleprice") ||
      line.includes("purchaseprice") ||
      line.includes("mrp") ||
      line.includes("hsn");

    // Party indicators
    const hasPartyKeys =
      line.includes("partyname") ||
      line.includes("customername") ||
      line.includes("suppliername") ||
      line.includes("mobileno") ||
      line.includes("phone") ||
      line.includes("gstin") ||
      line.includes("billingaddress") ||
      line.includes("openingbalance") ||
      line.includes("receivable") ||
      line.includes("payable");

    if (hasItemKeys && !hasPartyKeys) return "items";
    if (hasPartyKeys && !hasItemKeys) return "parties";
    if (hasItemKeys && hasPartyKeys) {
      const itemScore = (line.match(/price|stock|mrp|unit|hsn|sku/g) || []).length;
      const partyScore = (line.match(/phone|gstin|address|customer|supplier|balance/g) || []).length;
      return itemScore >= partyScore ? "items" : "parties";
    }
  }

  return "unknown";
}

// ─── Universal Table Row Item Extractor ──────────────────────────────────────

function parseUniversalItemsFromRows(
  rows: (string | number | null | undefined)[][],
  source: SupportedSoftware
): Partial<InventoryItem>[] {
  const items: Partial<InventoryItem>[] = [];
  if (rows.length < 2) return items;

  let headerIdx = -1;
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const rowStr = row.map(cleanHeader).join(" ");
    if (
      rowStr.includes("item") ||
      rowStr.includes("product") ||
      rowStr.includes("name") ||
      rowStr.includes("description") ||
      rowStr.includes("price") ||
      rowStr.includes("rate")
    ) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const headerRow = rows[headerIdx];

  const colName = findColIndex(headerRow, ["item name", "product name", "item", "product", "description", "particulars"]);
  const colSku = findColIndex(headerRow, ["item code", "sku code", "sku", "code", "alias", "item id"]);
  const colBarcode = findColIndex(headerRow, ["barcode", "upc", "ean", "qr"]);
  const colCategory = findColIndex(headerRow, ["category", "item category", "group", "item group", "sub category"]);
  const colBrand = findColIndex(headerRow, ["brand", "company", "make", "mfg"]);
  const colUnit = findColIndex(headerRow, ["measuring unit", "primary unit", "usage unit", "unit", "uom", "packing"]);
  const colSellPrice = findColIndex(headerRow, ["sale price", "selling price", "rate", "sale rate", "sales price", "retail price", "price"]);
  const colBuyPrice = findColIndex(headerRow, ["purchase price", "cost price", "cost rate", "cost", "buying price", "purchase rate", "buy price"]);
  const colMrp = findColIndex(headerRow, ["mrp", "max retail price", "maximum retail price"]);
  const colGst = findColIndex(headerRow, ["tax rate", "gst rate", "gst %", "tax %", "gst", "tax percentage", "tax category"]);
  const colHsn = findColIndex(headerRow, ["hsn code", "hsn", "sac code", "sac"]);
  const colStock = findColIndex(headerRow, ["stock quantity", "opening stock", "current stock", "stock qty", "stock", "op qty", "initial stock", "quantity", "qty"]);
  const colMinStock = findColIndex(headerRow, ["low stock warning", "min stock", "low stock", "min stock alert", "reorder level"]);
  const colBatch = findColIndex(headerRow, ["batch number", "batch no", "batch"]);
  const colExpiry = findColIndex(headerRow, ["expiry date", "exp date", "expiry", "exp"]);

  if (colName === -1) return items;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const nameRaw = row[colName];
    if (!nameRaw) continue;
    const name = String(nameRaw).trim();
    if (!name || name.toLowerCase() === "total" || name.toLowerCase().includes("grand total")) continue;

    const skuRaw = colSku !== -1 ? row[colSku] : "";
    const sku = skuRaw
      ? String(skuRaw).trim()
      : `SKU-${source.substring(0, 3).toUpperCase()}-${String(i).padStart(4, "0")}`;

    const barcodeRaw = colBarcode !== -1 ? row[colBarcode] : "";
    const barcode = barcodeRaw ? String(barcodeRaw).trim() : null;

    const categoryRaw = colCategory !== -1 ? row[colCategory] : "";
    const category = categoryRaw ? String(categoryRaw).trim() : "General";

    const brandRaw = colBrand !== -1 ? row[colBrand] : "";
    const brand = brandRaw ? String(brandRaw).trim() : null;

    const unitRaw = colUnit !== -1 ? row[colUnit] : "";
    const unit = mapUnit(unitRaw);

    const sellingPrice = colSellPrice !== -1 ? parseNum(row[colSellPrice], 0) : 0;
    const purchasePrice = colBuyPrice !== -1 ? parseNum(row[colBuyPrice], 0) : 0;
    const mrp = colMrp !== -1 ? parseNum(row[colMrp], sellingPrice || purchasePrice) : sellingPrice || purchasePrice;
    const gstRate = colGst !== -1 ? sanitizeGstRate(row[colGst]) : 18;
    const hsnRaw = colHsn !== -1 ? row[colHsn] : "";
    const hsnCode = hsnRaw ? String(hsnRaw).trim() : null;
    const openingStock = colStock !== -1 ? parseNum(row[colStock], 0) : 0;
    const minStockAlert = colMinStock !== -1 ? Math.max(1, parseNum(row[colMinStock], 5)) : 5;
    const batchNumber = colBatch !== -1 && row[colBatch] ? String(row[colBatch]).trim() : "BATCH-01";
    const expiryDate = colExpiry !== -1 && row[colExpiry] ? String(row[colExpiry]).trim() : null;

    items.push({
      name,
      sku,
      barcode,
      category,
      brand,
      unit: unit as InventoryItem["unit"],
      sellingPrice,
      purchasePrice,
      mrp,
      gstRate,
      hsnCode,
      openingStock,
      currentStock: openingStock,
      minStockAlert,
      isLowStock: openingStock <= minStockAlert,
      batches: [
        {
          id: `batch-${Date.now()}-${i}`,
          productId: "",
          batchNumber,
          costPrice: purchasePrice,
          sellingPrice,
          mrp,
          stock: openingStock,
          expiryDate,
        },
      ],
    });
  }

  return items;
}

// ─── Universal Table Row Party Extractor ─────────────────────────────────────

function parseUniversalPartiesFromRows(
  rows: (string | number | null | undefined)[][],
  source: SupportedSoftware
): Partial<Party>[] {
  const parties: Partial<Party>[] = [];
  if (rows.length < 2) return parties;

  let headerIdx = -1;
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const rowStr = row.map(cleanHeader).join(" ");
    if (
      rowStr.includes("party") ||
      rowStr.includes("customer") ||
      rowStr.includes("supplier") ||
      rowStr.includes("vendor") ||
      rowStr.includes("client") ||
      rowStr.includes("phone") ||
      rowStr.includes("mobile") ||
      rowStr.includes("balance")
    ) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const headerRow = rows[headerIdx];

  const colName = findColIndex(headerRow, ["party name", "customer name", "supplier name", "vendor name", "contact name", "display name", "name", "account name"]);
  const colPhone = findColIndex(headerRow, ["mobile no", "mobile number", "contact number", "phone number", "phone", "mobile", "work phone"]);
  const colEmail = findColIndex(headerRow, ["email", "email id", "email address"]);
  const colGstin = findColIndex(headerRow, ["party gstin", "gstin", "gst no", "gst registration", "tax number"]);
  const colPan = findColIndex(headerRow, ["pan no", "pan number", "pan"]);
  const colType = findColIndex(headerRow, ["party type", "contact type", "type", "group"]);
  const colAddress = findColIndex(headerRow, ["billing address", "address", "station", "location"]);
  const colCity = findColIndex(headerRow, ["city", "district", "station"]);
  const colState = findColIndex(headerRow, ["state", "state name", "place of supply"]);
  const colPincode = findColIndex(headerRow, ["pincode", "pin code", "zip code", "zip"]);
  const colBalance = findColIndex(headerRow, ["opening balance", "balance", "receivable balance", "payable balance", "current balance", "op bal"]);
  const colBalType = findColIndex(headerRow, ["balance type", "bal type", "dr cr", "dr/cr", "to receive / to pay"]);
  const colCreditLimit = findColIndex(headerRow, ["credit limit", "limit"]);
  const colCreditDays = findColIndex(headerRow, ["credit period", "credit days", "payment terms"]);

  if (colName === -1) return parties;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const nameRaw = row[colName];
    if (!nameRaw) continue;
    const name = String(nameRaw).trim();
    if (!name || name.toLowerCase() === "total" || name.toLowerCase().includes("grand total")) continue;

    const phoneRaw = colPhone !== -1 ? row[colPhone] : "";
    const phone = phoneRaw ? String(phoneRaw).replace(/[^0-9]/g, "").slice(-10) : null;

    const emailRaw = colEmail !== -1 ? row[colEmail] : "";
    const email = emailRaw ? String(emailRaw).trim() : null;

    const gstinRaw = colGstin !== -1 ? row[colGstin] : "";
    const gstin = gstinRaw ? String(gstinRaw).toUpperCase().trim() : null;

    const panRaw = colPan !== -1 ? row[colPan] : "";
    const pan = panRaw ? String(panRaw).toUpperCase().trim() : gstin ? gstin.substring(2, 12) : null;

    // Party Type detection
    let partyType: "customer" | "supplier" | "both" = "customer";
    const typeRaw = colType !== -1 ? String(row[colType] || "").toLowerCase() : "";
    if (typeRaw.includes("supplier") || typeRaw.includes("vendor") || typeRaw.includes("creditor")) {
      partyType = "supplier";
    } else if (typeRaw.includes("both")) {
      partyType = "both";
    }

    const addressRaw = colAddress !== -1 ? row[colAddress] : "";
    const address = addressRaw ? String(addressRaw).trim() : null;

    const cityRaw = colCity !== -1 ? row[colCity] : "";
    const city = cityRaw ? String(cityRaw).trim() : null;

    const stateRaw = colState !== -1 ? row[colState] : "";
    const state = stateRaw ? String(stateRaw).trim() : null;

    const pincodeRaw = colPincode !== -1 ? row[colPincode] : "";
    const pincode = pincodeRaw ? String(pincodeRaw).trim() : null;

    // Balance calculation (Positive = Dr / To Collect, Negative = Cr / To Pay)
    const rawBalance = colBalance !== -1 ? parseNum(row[colBalance], 0) : 0;
    const balTypeRaw = colBalType !== -1 ? String(row[colBalType] || "").toLowerCase() : "";

    let balance = rawBalance;
    if (balTypeRaw.includes("pay") || balTypeRaw.includes("cr") || balTypeRaw.includes("credit")) {
      balance = -Math.abs(rawBalance);
    } else if (balTypeRaw.includes("collect") || balTypeRaw.includes("receive") || balTypeRaw.includes("dr") || balTypeRaw.includes("debit")) {
      balance = Math.abs(rawBalance);
    } else if (partyType === "supplier" && rawBalance > 0) {
      balance = -rawBalance;
    }

    const creditLimit = colCreditLimit !== -1 ? parseNum(row[colCreditLimit], 0) : null;
    const creditPeriodDays = colCreditDays !== -1 ? parseInt(String(row[colCreditDays] || "0"), 10) || null : null;

    parties.push({
      name,
      tradeName: name,
      phone: phone || null,
      email: email || null,
      partyType,
      category: partyType === "supplier" ? "Wholesaler" : "Retailer",
      gstin: gstin || null,
      pan: pan || null,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      openingBalance: Math.abs(balance),
      balance,
      creditLimit: creditLimit || null,
      creditPeriodDays,
    });
  }

  return parties;
}

// ─── Main Universal File Parser ──────────────────────────────────────────────

export async function parseUniversalFile(
  file: File,
  chosenSoftware: SupportedSoftware = "auto"
): Promise<UniversalImportData> {
  const filename = file.name;
  const warnings: string[] = [];

  // 1. Parse into Sheets
  const sheets = await parseFileToSheets(file);
  if (sheets.length === 0) {
    throw new Error(`File ${filename} contains no readable sheets or data.`);
  }

  // 2. Identify Software
  const detectedSoftware =
    chosenSoftware === "auto"
      ? detectSoftwareFromSheets(sheets, file)
      : chosenSoftware;

  // 3. If Tally XML: execute dedicated high-fidelity XML parser
  if (filename.toLowerCase().endsWith(".xml") || (sheets[0]?.rows?.[0]?.[0] && String(sheets[0].rows[0][0]).includes("<ENVELOPE>"))) {
    const rawXml = (sheets[0]?.rows?.[0]?.[0] ? String(sheets[0].rows[0][0]) : "") || (await readFileText(file));
    const tallyResult = parseTallyXml(rawXml);

    const customers = tallyResult.parties.filter((p) => p.partyType === "customer" || p.partyType === "both");
    const suppliers = tallyResult.parties.filter((p) => p.partyType === "supplier");

    const allVouchers = [
      ...tallyResult.salesVouchers,
      ...tallyResult.purchaseVouchers,
      ...tallyResult.paymentVouchers,
      ...tallyResult.receiptVouchers,
      ...tallyResult.journalVouchers,
      ...(tallyResult.creditNoteVouchers || []),
      ...(tallyResult.debitNoteVouchers || []),
    ];

    const totalReceivable = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
    const totalPayable = suppliers.reduce((sum, s) => sum + Math.abs(Math.min(0, s.balance || 0)), 0);

    const mappedBankAccounts = tallyResult.bankAccounts.map((b) => ({
      accountName: b.name || b.bankName,
      accountNumber: b.accountNumber || "—",
      ifsc: b.ifscCode || "—",
      balance: b.balance,
    }));

    return {
      sourceSoftware: chosenSoftware,
      detectedSoftware: "tally",
      detectedEntityTypes: [
        ...(tallyResult.items.length > 0 ? ["items" as const] : []),
        ...(tallyResult.parties.length > 0 ? ["parties" as const] : []),
        ...(mappedBankAccounts.length > 0 ? ["bank" as const] : []),
        ...(allVouchers.length > 0 ? ["vouchers" as const] : []),
      ],
      companyName: tallyResult.companyName,
      companyGstin: tallyResult.companyGstin,
      items: tallyResult.items,
      parties: {
        customers,
        suppliers,
        all: tallyResult.parties,
      },
      bankAccounts: mappedBankAccounts,
      cashInHand: tallyResult.cashInHand || 0,
      vouchers: allVouchers,
      summary: {
        totalItems: tallyResult.items.length,
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length,
        totalParties: tallyResult.parties.length,
        totalOpeningReceivable: totalReceivable,
        totalOpeningPayable: totalPayable,
        totalBankAccounts: mappedBankAccounts.length,
        totalVouchers: allVouchers.length,
      },
      warnings: tallyResult.warnings,
      fileNames: [filename],
    };
  }

  // 4. Multi-sheet / Excel / CSV table processing
  const allItems: Partial<InventoryItem>[] = [];
  const allParties: Partial<Party>[] = [];
  const allVouchers: TallyVoucher[] = [];

  sheets.forEach((sheet) => {
    // Check if sheet contains Tally Daybook vouchers
    const isDaybook = sheet.rows.length >= 2 && sheet.rows.slice(0, 5).some((r) => {
      const line = Array.isArray(r) ? r.map(cleanHeader).join(" ") : "";
      return (line.includes("vchtype") || line.includes("vouchertype")) && (line.includes("particulars") || line.includes("vchno"));
    });

    if (isDaybook) {
      const headerIdx = sheet.rows.findIndex((r) => {
        const line = Array.isArray(r) ? r.map(cleanHeader).join(" ") : "";
        return (line.includes("vchtype") || line.includes("vouchertype")) && line.includes("particulars");
      });

      if (headerIdx >= 0) {
        const header = sheet.rows[headerIdx];
        const colDate = findColIndex(header, ["date", "voucherdate"]);
        const colPart = findColIndex(header, ["particulars", "party", "account", "name", "ledger"]);
        const colType = findColIndex(header, ["vchtype", "vouchertype", "type"]);
        const colNo = findColIndex(header, ["vchno", "voucherno", "invoiceno", "billno"]);
        const colDebit = findColIndex(header, ["debit", "debitamount", "dr"]);
        const colCredit = findColIndex(header, ["credit", "creditamount", "cr"]);

        if (colPart !== -1 && colType !== -1) {
          sheet.rows.slice(headerIdx + 1).forEach((row, rIdx) => {
            if (!Array.isArray(row)) return;
            const partyName = String(row[colPart] || "").trim();
            const typeStr = String(row[colType] || "").trim();
            if (!partyName || !typeStr || partyName.toLowerCase() === "total") return;

            const rawDate = colDate !== -1 ? String(row[colDate] || "") : "";
            let date = new Date().toISOString().split("T")[0];
            const dmyMatch = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
            if (dmyMatch) {
              const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
              date = `${year}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
              date = rawDate;
            }

            const vchNo = (colNo !== -1 ? String(row[colNo] || "").trim() : "") || `DAY-${rIdx + 1}`;
            const debit = colDebit !== -1 ? parseNum(row[colDebit], 0) : 0;
            const credit = colCredit !== -1 ? parseNum(row[colCredit], 0) : 0;
            const amount = Math.max(debit, credit);

            let vchType: TallyVoucher["voucherType"] = "Sales";
            const lowerType = typeStr.toLowerCase();
            if (lowerType.includes("sale")) vchType = "Sales";
            else if (lowerType.includes("purchase")) vchType = "Purchase";
            else if (lowerType.includes("receipt")) vchType = "Receipt";
            else if (lowerType.includes("payment")) vchType = "Payment";
            else if (lowerType.includes("credit note")) vchType = "Credit Note";
            else if (lowerType.includes("debit note")) vchType = "Debit Note";
            else vchType = "Journal";

            allVouchers.push({
              voucherNumber: vchNo,
              date,
              voucherType: vchType,
              partyName,
              amount,
              ledgerEntries: [{ ledgerName: partyName, amount, isDr: debit > 0 }],
            });
          });
        }
      }
    }

    const contentType = detectSheetContentType(sheet.rows);

    if (contentType === "items") {
      const extracted = parseUniversalItemsFromRows(sheet.rows, detectedSoftware);
      allItems.push(...extracted);
    } else if (contentType === "parties") {
      const extracted = parseUniversalPartiesFromRows(sheet.rows, detectedSoftware);
      allParties.push(...extracted);
    } else if (!isDaybook) {
      const testItems = parseUniversalItemsFromRows(sheet.rows, detectedSoftware);
      const testParties = parseUniversalPartiesFromRows(sheet.rows, detectedSoftware);

      if (testItems.length >= testParties.length && testItems.length > 0) {
        allItems.push(...testItems);
      } else if (testParties.length > 0) {
        allParties.push(...testParties);
      }
    }
  });

  // Deduplicate items by SKU or Name
  const uniqueItemsMap = new Map<string, Partial<InventoryItem>>();
  allItems.forEach((it) => {
    const key = (it.sku || it.name || "").toLowerCase().trim();
    if (key && !uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, it);
    }
  });
  const uniqueItems = Array.from(uniqueItemsMap.values());

  // Deduplicate parties by Phone, GSTIN, or Name
  const uniquePartiesMap = new Map<string, Partial<Party>>();
  allParties.forEach((p) => {
    const key = (p.phone || p.gstin || p.name || "").toLowerCase().trim();
    if (key && !uniquePartiesMap.has(key)) {
      uniquePartiesMap.set(key, p);
    }
  });
  const uniqueParties = Array.from(uniquePartiesMap.values());

  const customers = uniqueParties.filter((p) => p.partyType === "customer" || p.partyType === "both");
  const suppliers = uniqueParties.filter((p) => p.partyType === "supplier");

  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  const totalPayable = suppliers.reduce((sum, s) => sum + Math.abs(Math.min(0, s.balance || 0)), 0);

  if (uniqueItems.length === 0 && uniqueParties.length === 0 && allVouchers.length === 0) {
    warnings.push(
      `No valid inventory items, parties or daybook vouchers could be recognized in ${filename}. Check if your file has standard column headers (e.g. Item Name, Sale Price, Party Name, Mobile).`
    );
  }

  return {
    sourceSoftware: chosenSoftware,
    detectedSoftware,
    detectedEntityTypes: [
      ...(uniqueItems.length > 0 ? ["items" as const] : []),
      ...(uniqueParties.length > 0 ? ["parties" as const] : []),
      ...(allVouchers.length > 0 ? ["vouchers" as const] : []),
    ],
    items: uniqueItems,
    parties: {
      customers,
      suppliers,
      all: uniqueParties,
    },
    bankAccounts: [],
    cashInHand: 0,
    vouchers: allVouchers,
    summary: {
      totalItems: uniqueItems.length,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalParties: uniqueParties.length,
      totalOpeningReceivable: totalReceivable,
      totalOpeningPayable: totalPayable,
      totalBankAccounts: 0,
      totalVouchers: allVouchers.length,
    },
    warnings,
    fileNames: [filename],
  };
}

// ─── Multi-File Aggregator ───────────────────────────────────────────────────

export async function parseMultipleUniversalFiles(
  files: File[],
  chosenSoftware: SupportedSoftware = "auto"
): Promise<UniversalImportData> {
  if (files.length === 0) {
    throw new Error("No files selected for import.");
  }

  // Inspect folder structure if multiple files are provided
  const scanned = await inspectUploadedFolder(files);

  // Filter for parseable files: .xml, .xlsx, .xls, .csv, .txt
  const parsableFiles = files.filter((f) => {
    const ext = f.name.toLowerCase();
    return (
      ext.endsWith(".xml") ||
      ext.endsWith(".xlsx") ||
      ext.endsWith(".xls") ||
      ext.endsWith(".csv") ||
      ext.endsWith(".txt")
    );
  });

  if (parsableFiles.length === 0) {
    if (scanned.isRawTallyCompanyDir) {
      // Raw Tally directory with no XML/Excel exports yet
      const cName = scanned.tallyCompanyInfo?.companyName || `Tally Company (${scanned.folderName})`;
      return {
        sourceSoftware: "tally",
        detectedSoftware: "tally",
        detectedEntityTypes: [],
        companyName: cName,
        folderName: scanned.folderName,
        isRawTallyFolder: true,
        items: [],
        parties: { customers: [], suppliers: [], all: [] },
        bankAccounts: [],
        cashInHand: 0,
        vouchers: [],
        summary: {
          totalItems: 0,
          totalCustomers: 0,
          totalSuppliers: 0,
          totalParties: 0,
          totalOpeningReceivable: 0,
          totalOpeningPayable: 0,
          totalBankAccounts: 0,
          totalVouchers: 0,
        },
        warnings: [
          `Detected raw Tally company directory "${scanned.folderName}" for "${cName}". To import all stock and ledgers with 100% tax and transaction accuracy, open this company in Tally Prime, press Alt+E > Masters (XML format), and drop the XML file here.`,
        ],
        fileNames: files.map((f) => f.name),
      };
    }
    throw new Error("No supported accounting files (.xml, .xlsx, .csv) found in the selected folder.");
  }

  if (parsableFiles.length === 1 && !scanned.isRawTallyCompanyDir) {
    return parseUniversalFile(parsableFiles[0], chosenSoftware);
  }

  const fileResults: UniversalImportData[] = [];
  for (const f of parsableFiles) {
    try {
      const res = await parseUniversalFile(f, chosenSoftware);
      fileResults.push(res);
    } catch (e) {
      console.warn(`Error parsing file ${f.name}:`, e);
    }
  }

  if (fileResults.length === 0) {
    throw new Error("Could not parse any of the files in the selected folder.");
  }

  // Merge items
  const itemsMap = new Map<string, Partial<InventoryItem>>();
  fileResults.forEach((r) => {
    r.items.forEach((it) => {
      const key = (it.sku || it.name || "").toLowerCase().trim();
      if (key && !itemsMap.has(key)) itemsMap.set(key, it);
    });
  });

  // Merge parties
  const partiesMap = new Map<string, Partial<Party>>();
  fileResults.forEach((r) => {
    r.parties.all.forEach((p) => {
      const key = (p.phone || p.gstin || p.name || "").toLowerCase().trim();
      if (key && !partiesMap.has(key)) partiesMap.set(key, p);
    });
  });

  const mergedItems = Array.from(itemsMap.values());
  const mergedParties = Array.from(partiesMap.values());

  const customers = mergedParties.filter((p) => p.partyType === "customer" || p.partyType === "both");
  const suppliers = mergedParties.filter((p) => p.partyType === "supplier");

  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  const totalPayable = suppliers.reduce((sum, s) => sum + Math.abs(Math.min(0, s.balance || 0)), 0);

  const allWarnings = fileResults.flatMap((r) => r.warnings);
  const allVouchers = fileResults.flatMap((r) => r.vouchers);
  const allBanks = fileResults.flatMap((r) => r.bankAccounts);

  const finalCompanyName =
    scanned.tallyCompanyInfo?.companyName ||
    fileResults.find((r) => r.companyName)?.companyName ||
    undefined;

  return {
    sourceSoftware: chosenSoftware,
    detectedSoftware: fileResults[0]?.detectedSoftware || (scanned.isRawTallyCompanyDir ? "tally" : "custom"),
    detectedEntityTypes: [
      ...(mergedItems.length > 0 ? ["items" as const] : []),
      ...(mergedParties.length > 0 ? ["parties" as const] : []),
      ...(allBanks.length > 0 ? ["bank" as const] : []),
      ...(allVouchers.length > 0 ? ["vouchers" as const] : []),
    ],
    companyName: finalCompanyName,
    folderName: scanned.folderName,
    isRawTallyFolder: scanned.isRawTallyCompanyDir,
    items: mergedItems,
    parties: {
      customers,
      suppliers,
      all: mergedParties,
    },
    bankAccounts: fileResults.flatMap((r) => r.bankAccounts),
    cashInHand: fileResults.reduce((sum, r) => sum + (r.cashInHand || 0), 0),
    vouchers: allVouchers,
    summary: {
      totalItems: mergedItems.length,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalParties: mergedParties.length,
      totalOpeningReceivable: totalReceivable,
      totalOpeningPayable: totalPayable,
      totalBankAccounts: fileResults.flatMap((r) => r.bankAccounts).length,
      totalVouchers: allVouchers.length,
    },
    warnings: Array.from(new Set(allWarnings)),
    fileNames: files.map((f) => f.name),
  };
}
