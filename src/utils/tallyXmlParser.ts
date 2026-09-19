import { InventoryItem, GSTRate } from "@/types/inventory";
import { Party } from "@/types/parties";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TallyParseResult {
  items: Partial<InventoryItem>[];
  parties: Partial<Party>[];
  salesVouchers: TallyVoucher[];
  purchaseVouchers: TallyVoucher[];
  companyName?: string;
  companyGstin?: string;
  totalEntities: number;
  warnings: string[];
  source: "xml" | "csv";
}

export interface TallyVoucher {
  voucherNumber: string;
  date: string;
  voucherType: "Sales" | "Purchase" | "Receipt" | "Payment" | "Journal";
  partyName: string;
  amount: number;
  narration?: string;
  ledgerEntries: TallyLedgerEntry[];
}

export interface TallyLedgerEntry {
  ledgerName: string;
  amount: number;
  isDr: boolean;
}

// ─── XML Helpers ─────────────────────────────────────────────────────────────

function getText(el: Element | null, tag: string): string {
  if (!el) return "";
  const child = el.querySelector(tag);
  return child?.textContent?.trim() ?? "";
}

function getAttr(el: Element | null, attr: string): string {
  if (!el) return "";
  return el.getAttribute(attr)?.trim() ?? "";
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  // Tally uses negative for Cr entries, strip commas
  const cleaned = raw.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseTallyDate(raw: string): string {
  // Tally date format: YYYYMMDD → YYYY-MM-DD
  if (!raw || raw.length !== 8) return new Date().toISOString().split("T")[0];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function isCrBalance(raw: string): boolean {
  // Tally uses negative numbers or "Cr" suffix for payable (we owe them)
  return raw.includes("-") || raw.toLowerCase().includes("cr");
}

function sanitizeGstRate(raw: string): GSTRate {
  const n = parseFloat(raw);
  const valid: GSTRate[] = [0, 0.1, 0.25, 3, 5, 12, 18, 28];
  return (valid.includes(n as GSTRate) ? n : 18) as GSTRate;
}

function mapTallyUnit(raw: string): string {
  const u = raw?.toUpperCase()?.trim();
  const map: Record<string, string> = {
    NOS: "NOS", PCS: "PCS", KGS: "KG", KG: "KG",
    LTR: "LTR", L: "LTR", LTS: "LTR",
    MTR: "MTR", M: "MTR",
    BOX: "BOX", PKT: "PKT", BAG: "BAG",
    CAN: "CAN", BTL: "BTL", SET: "SET",
    GM: "GM", G: "GM", GMS: "GM",
    ML: "ML", DOZ: "DOZ",
  };
  return map[u] ?? "PCS";
}

function mapPartyCategory(parentGroup: string): string {
  const g = parentGroup?.toLowerCase() ?? "";
  if (g.includes("debtor")) return "Retailer";
  if (g.includes("creditor") || g.includes("supplier")) return "Wholesaler";
  if (g.includes("distributor")) return "Distributor";
  if (g.includes("manufacturer")) return "Manufacturer";
  if (g.includes("customer")) return "End Consumer";
  return "General";
}

function inferPartyType(parentGroup: string): "customer" | "supplier" | "both" {
  const g = parentGroup?.toLowerCase() ?? "";
  if (g.includes("debtor") || g.includes("customer") || g.includes("receivable")) return "customer";
  if (g.includes("creditor") || g.includes("supplier") || g.includes("payable")) return "supplier";
  return "both";
}

// ─── XML Parsers ──────────────────────────────────────────────────────────────

function parseStockItems(doc: Document): Partial<InventoryItem>[] {
  const items: Partial<InventoryItem>[] = [];
  const stockItemEls = doc.querySelectorAll("STOCKITEM");

  stockItemEls.forEach((el, idx) => {
    const name = getAttr(el, "NAME") || getText(el, "NAME");
    if (!name) return;

    const unit = mapTallyUnit(getText(el, "BASEUNITS"));
    const openingBalanceRaw = getText(el, "OPENINGBALANCE");
    const openingRateRaw = getText(el, "OPENINGRATE");
    const openingStock = Math.abs(parseFloat(openingBalanceRaw.replace(/,/g, "")) || 0);
    const purchasePrice = parseAmount(openingRateRaw);

    // HSN from HSNDETAILS.LIST or direct
    const hsnEl = el.querySelector("HSNDETAILS\\.LIST, HSNDETAILS");
    const hsnCode = hsnEl ? (getText(hsnEl, "HSNCODE") || getText(hsnEl, "HSN") || "") : getText(el, "HSNCODE") || "";

    // GST Rate from GSTDETAILS or tax classification
    const gstEl = el.querySelector("GSTDETAILS\\.LIST, GSTDETAILS");
    const rawGstRate = gstEl ? (getText(gstEl, "TAXRATE") || getText(gstEl, "RATE")) : getText(el, "TAXRATE") || "18";
    const gstRate = sanitizeGstRate(rawGstRate || "18");

    const parent = getText(el, "PARENT");
    const category = parent || "General";

    items.push({
      name,
      sku: `TLY-${(name.substring(0, 6).replace(/\s/g, "")).toUpperCase()}-${String(idx + 1).padStart(4, "0")}`,
      barcode: null,
      category,
      brand: null,
      unit: unit as InventoryItem["unit"],
      sellingPrice: purchasePrice > 0 ? Math.round(purchasePrice * 1.15) : 0,
      purchasePrice,
      mrp: purchasePrice > 0 ? Math.round(purchasePrice * 1.2) : 0,
      gstRate,
      hsnCode: hsnCode || null,
      openingStock,
      currentStock: openingStock,
      minStockAlert: Math.max(1, Math.floor(openingStock * 0.1)),
      isLowStock: false,
      batches: [],
    });
  });

  return items;
}

function parseLedgers(doc: Document): Partial<Party>[] {
  const parties: Partial<Party>[] = [];
  const ledgerEls = doc.querySelectorAll("LEDGER");

  ledgerEls.forEach((el) => {
    const name = getAttr(el, "NAME") || getText(el, "NAME");
    if (!name) return;

    const parent = getText(el, "PARENT");
    // Skip system ledgers (Cash, Bank, Tax, P&L etc.)
    const systemGroups = [
      "cash", "bank", "profit", "loss", "capital", "duty", "tax",
      "sales", "purchase", "stock", "expenses", "income", "indirect",
      "direct", "reserves", "loans", "secured", "unsecured",
    ];
    const parentLower = parent.toLowerCase();
    const isSystemLedger = systemGroups.some((g) => parentLower.includes(g));
    if (isSystemLedger && !parentLower.includes("debtor") && !parentLower.includes("creditor")) return;

    // Multi-line address support
    const addressEls = el.querySelectorAll("ADDRESS, ADDRESS\\.LIST");
    const addressParts: string[] = [];
    addressEls.forEach((a) => {
      const text = a.textContent?.trim();
      if (text) addressParts.push(text);
    });
    const address = addressParts.join(", ") || getText(el, "ADDRESS");

    const openingRaw = getText(el, "OPENINGBALANCE");
    const isCr = isCrBalance(openingRaw);
    const openingBalance = parseAmount(openingRaw);
    // Cr = payable (negative in CredSmart), Dr = receivable (positive)
    const balance = isCr ? -openingBalance : openingBalance;

    const gstin = getText(el, "PARTYGSTIN") || getText(el, "GSTIN") || "";
    const pan = getText(el, "PAN") || getText(el, "PANNUMBER") || "";
    const phone = getText(el, "LEDGERMOBILE") || getText(el, "MOBILEPHONE") || getText(el, "PHONE") || "";
    const email = getText(el, "EMAIL") || getText(el, "EMAILID") || "";
    const pincode = getText(el, "PINCODE") || getText(el, "ZIP") || "";
    const state = getText(el, "LEDSTATE") || getText(el, "STATENAME") || "";
    const city = getText(el, "CITY") || "";
    const creditLimit = parseAmount(getText(el, "CREDITLIMIT") || "0");
    const creditDays = parseInt(getText(el, "CREDITPERIOD") || "0", 10) || 0;
    const partyType = inferPartyType(parent);
    const category = mapPartyCategory(parent);

    parties.push({
      name,
      tradeName: name,
      phone: phone || null,
      email: email || null,
      partyType,
      category,
      gstin: gstin || null,
      pan: pan || null,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      openingBalance: Math.abs(openingBalance),
      balance,
      creditLimit: creditLimit || null,
      creditPeriodDays: creditDays || null,
    });
  });

  return parties;
}

function parseVouchers(doc: Document, vchType: string): TallyVoucher[] {
  const vouchers: TallyVoucher[] = [];
  const voucherEls = doc.querySelectorAll("VOUCHER");

  voucherEls.forEach((el) => {
    const type = getAttr(el, "VCHTYPE") || getText(el, "VOUCHERTYPENAME");
    if (!type.toLowerCase().includes(vchType.toLowerCase())) return;

    const dateRaw = getText(el, "DATE");
    const voucherNumber = getText(el, "VOUCHERNUMBER") || getText(el, "ALTEREDON") || "";
    const partyName = getText(el, "PARTYLEDGERNAME") || getText(el, "BASICBUYERNAME") || "";
    const narration = getText(el, "NARRATION") || "";

    const ledgerEntries: TallyLedgerEntry[] = [];
    let totalAmount = 0;

    const ledgerEntryEls = el.querySelectorAll("ALLLEDGERENTRIES\\.LIST, ALLLEDGERENTRIES");
    ledgerEntryEls.forEach((entry) => {
      const ledgerName = getText(entry, "LEDGERNAME");
      const amountRaw = getText(entry, "AMOUNT");
      const isDr = !amountRaw.includes("-");
      const amount = parseAmount(amountRaw);
      if (ledgerName && amount > 0) {
        ledgerEntries.push({ ledgerName, amount, isDr });
        if (!ledgerName.toLowerCase().includes("sales") && !ledgerName.toLowerCase().includes("purchase")) {
          totalAmount = Math.max(totalAmount, amount);
        }
      }
    });

    if (voucherNumber && partyName) {
      vouchers.push({
        voucherNumber,
        date: parseTallyDate(dateRaw),
        voucherType: vchType as TallyVoucher["voucherType"],
        partyName,
        amount: totalAmount,
        narration,
        ledgerEntries,
      });
    }
  });

  return vouchers;
}

function parseCompanyMaster(doc: Document): { name?: string; gstin?: string } {
  const companyEl = doc.querySelector("COMPANY");
  if (!companyEl) return {};
  return {
    name: getAttr(companyEl, "NAME") || getText(companyEl, "NAME"),
    gstin: getText(companyEl, "GSTIN") || getText(companyEl, "GSTREGISTRATIONNO"),
  };
}

// ─── Main XML Entry ───────────────────────────────────────────────────────────

export function parseTallyXml(xmlText: string): TallyParseResult {
  const warnings: string[] = [];

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlText, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid XML: " + parseError.textContent?.substring(0, 100));
    }
  } catch (e) {
    throw new Error("Failed to parse Tally XML file. Please ensure you exported a valid XML from Tally Prime or ERP 9.");
  }

  const items = parseStockItems(doc);
  const parties = parseLedgers(doc);
  const salesVouchers = parseVouchers(doc, "Sales");
  const purchaseVouchers = parseVouchers(doc, "Purchase");
  const company = parseCompanyMaster(doc);

  if (items.length === 0 && parties.length === 0 && salesVouchers.length === 0 && purchaseVouchers.length === 0) {
    warnings.push("No recognizable Tally entities found in this XML file. Ensure you exported Stock Items or Ledger data from Tally.");
  }

  return {
    items,
    parties,
    salesVouchers,
    purchaseVouchers,
    companyName: company.name,
    companyGstin: company.gstin,
    totalEntities: items.length + parties.length + salesVouchers.length + purchaseVouchers.length,
    warnings,
    source: "xml",
  };
}

// ─── Tally CSV Parsers ───────────────────────────────────────────────────────

function parseTallyLine(line: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      tokens.push(cur.trim()); cur = "";
    } else {
      cur += c;
    }
  }
  tokens.push(cur.trim());
  return tokens;
}

export function parseTallyStockCsv(csvText: string): Partial<InventoryItem>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerTokens = parseTallyLine(lines[0]);
  const normalized = headerTokens.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const findCol = (keys: string[]) => {
    for (let i = 0; i < normalized.length; i++) {
      for (const k of keys) {
        if (normalized[i].includes(k)) return i;
      }
    }
    return -1;
  };

  // Tally Stock Summary / Stock Item List column names
  const idx = {
    name: findCol(["stockitemname", "itemname", "name", "stockitem", "item"]),
    group: findCol(["group", "category", "parent", "under"]),
    unit: findCol(["unit", "uom", "baseunit"]),
    openingQty: findCol(["closingbalance", "openingbalance", "closingqty", "qty", "quantity", "balance"]),
    rate: findCol(["rate", "mrp", "price", "costprice", "purchaseprice", "openingrate"]),
    hsn: findCol(["hsn", "hsncode", "hsnsac"]),
    gst: findCol(["gstrate", "gst", "taxrate", "tax"]),
  };

  if (idx.name === -1) return [];

  const items: Partial<InventoryItem>[] = [];
  lines.slice(1).forEach((line, lineIdx) => {
    const cols = parseTallyLine(line);
    if (!cols[idx.name]) return;

    const name = cols[idx.name]?.trim();
    if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "grand total") return;

    const unit = mapTallyUnit(idx.unit >= 0 ? cols[idx.unit] : "PCS");
    const openingStock = Math.abs(parseFloat((idx.openingQty >= 0 ? cols[idx.openingQty] : "0").replace(/,/g, "")) || 0);
    const purchasePrice = parseAmount(idx.rate >= 0 ? cols[idx.rate] : "0");
    const gstRate = sanitizeGstRate(idx.gst >= 0 ? cols[idx.gst] : "18");
    const hsnCode = idx.hsn >= 0 ? cols[idx.hsn]?.trim() : "";
    const category = idx.group >= 0 ? cols[idx.group]?.trim() : "General";

    items.push({
      name,
      sku: `TLY-${(name.substring(0, 6).replace(/\s/g, "")).toUpperCase()}-${String(lineIdx + 1).padStart(4, "0")}`,
      barcode: null,
      category: category || "General",
      brand: null,
      unit: unit as InventoryItem["unit"],
      sellingPrice: purchasePrice > 0 ? Math.round(purchasePrice * 1.15) : 0,
      purchasePrice,
      mrp: purchasePrice > 0 ? Math.round(purchasePrice * 1.2) : 0,
      gstRate,
      hsnCode: hsnCode || null,
      openingStock,
      currentStock: openingStock,
      minStockAlert: Math.max(1, Math.floor(openingStock * 0.1)),
      isLowStock: false,
      batches: [],
    });
  });

  return items;
}

export function parseTallyLedgerCsv(csvText: string): Partial<Party>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerTokens = parseTallyLine(lines[0]);
  const normalized = headerTokens.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const findCol = (keys: string[]) => {
    for (let i = 0; i < normalized.length; i++) {
      for (const k of keys) {
        if (normalized[i].includes(k)) return i;
      }
    }
    return -1;
  };

  // Tally Ledger Master / Account Books export column names
  const idx = {
    name: findCol(["ledgername", "name", "ledger", "accountname", "account"]),
    parent: findCol(["under", "group", "parent", "accountgroup"]),
    openingBalance: findCol(["openingbalance", "opening", "balance", "closingbalance"]),
    drCr: findCol(["drcr", "drorcr", "type", "debitcredit"]),
    gstin: findCol(["gstin", "gstno", "gstregistration"]),
    pan: findCol(["pan", "pannumber", "panno"]),
    phone: findCol(["phone", "mobile", "mobilephone", "contact"]),
    email: findCol(["email", "emailid", "emailaddress"]),
    address: findCol(["address", "principalplace", "billingaddress"]),
    pincode: findCol(["pincode", "zip", "postal"]),
    state: findCol(["state", "statename"]),
    city: findCol(["city", "district"]),
    creditLimit: findCol(["creditlimit", "credit"]),
  };

  if (idx.name === -1) return [];

  const systemGroups = [
    "cash", "bank", "profit", "loss", "capital", "duty", "tax",
    "sales account", "purchase account", "stock",
  ];

  const parties: Partial<Party>[] = [];
  lines.slice(1).forEach((line) => {
    const cols = parseTallyLine(line);
    const name = (idx.name >= 0 ? cols[idx.name] : "")?.trim();
    if (!name || name.toLowerCase() === "total") return;

    const parent = (idx.parent >= 0 ? cols[idx.parent] : "")?.toLowerCase() ?? "";
    const isSystem = systemGroups.some((g) => parent.includes(g)) && !parent.includes("debtor") && !parent.includes("creditor");
    if (isSystem) return;

    const openingRaw = (idx.openingBalance >= 0 ? cols[idx.openingBalance] : "0") ?? "0";
    const drCr = (idx.drCr >= 0 ? cols[idx.drCr] : "")?.toLowerCase() ?? "";
    const openingAmt = parseAmount(openingRaw);
    // Cr = payable (negative), Dr = receivable (positive)
    const isCr = drCr.includes("cr") || isCrBalance(openingRaw);
    const balance = isCr ? -openingAmt : openingAmt;

    parties.push({
      name,
      tradeName: name,
      phone: (idx.phone >= 0 ? cols[idx.phone] : null)?.trim() || null,
      email: (idx.email >= 0 ? cols[idx.email] : null)?.trim() || null,
      partyType: inferPartyType(parent),
      category: mapPartyCategory(parent),
      gstin: (idx.gstin >= 0 ? cols[idx.gstin] : null)?.trim() || null,
      pan: (idx.pan >= 0 ? cols[idx.pan] : null)?.trim() || null,
      address: (idx.address >= 0 ? cols[idx.address] : null)?.trim() || null,
      city: (idx.city >= 0 ? cols[idx.city] : null)?.trim() || null,
      state: (idx.state >= 0 ? cols[idx.state] : null)?.trim() || null,
      pincode: (idx.pincode >= 0 ? cols[idx.pincode] : null)?.trim() || null,
      openingBalance: openingAmt,
      balance,
      creditLimit: idx.creditLimit >= 0 ? parseAmount(cols[idx.creditLimit] ?? "0") : null,
      creditPeriodDays: null,
    });
  });

  return parties;
}

// ─── Auto-detect and parse ───────────────────────────────────────────────────

export function autoDetectAndParseTally(content: string, filename: string): TallyParseResult {
  const isXml = filename.toLowerCase().endsWith(".xml") || content.trimStart().startsWith("<");

  if (isXml) {
    return parseTallyXml(content);
  }

  // CSV mode: try to detect entity type from headers
  const firstLine = content.split(/\r?\n/)[0]?.toLowerCase() ?? "";
  const isLedger =
    firstLine.includes("ledger") ||
    firstLine.includes("account") ||
    firstLine.includes("debtor") ||
    firstLine.includes("creditor") ||
    firstLine.includes("gstin") ||
    firstLine.includes("opening balance");

  const items = isLedger ? [] : parseTallyStockCsv(content);
  const parties = isLedger ? parseTallyLedgerCsv(content) : [];

  // If stock parse found nothing, try ledger
  const finalItems = items;
  const finalParties = parties.length === 0 && !isLedger ? parseTallyLedgerCsv(content) : parties;

  const warnings: string[] = [];
  if (finalItems.length === 0 && finalParties.length === 0) {
    warnings.push(
      "Could not detect Tally entity type from this CSV. For best results, export as XML from Tally Prime (Alt+E → XML format)."
    );
  }

  return {
    items: finalItems,
    parties: finalParties,
    salesVouchers: [],
    purchaseVouchers: [],
    totalEntities: finalItems.length + finalParties.length,
    warnings,
    source: "csv",
  };
}
