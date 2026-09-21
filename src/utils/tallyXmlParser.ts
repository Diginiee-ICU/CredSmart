import { InventoryItem, GSTRate } from "@/types/inventory";
import { Party } from "@/types/parties";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TallyBankAccount {
  name: string;
  accountName?: string;
  bankName: string;
  accountNumber?: string;
  ifscCode?: string;
  ifsc?: string;
  balance: number;
  isDr?: boolean;
}

export interface TallyVoucherItem {
  itemName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discountPercent?: number;
  discountAmount?: number;
  batchNumber?: string;
  expiryDate?: string;
  godown?: string;
}

export interface TallyLedgerEntry {
  ledgerName: string;
  amount: number;
  isDr: boolean;
}

export interface TallyBillAllocation {
  name: string;
  billDate?: string;
  creditDays?: number;
  amount: number;
  billType?: string;
}

export interface TallyVoucher {
  voucherNumber: string;
  date: string;
  voucherType: "Sales" | "Purchase" | "Receipt" | "Payment" | "Journal" | "Credit Note" | "Debit Note";
  partyName: string;
  partyGstin?: string;
  partyAddress?: string;
  placeOfSupply?: string;
  amount: number;
  narration?: string;
  ledgerEntries: TallyLedgerEntry[];
  items?: TallyVoucherItem[];
}

export interface TallyParseResult {
  items: Partial<InventoryItem>[];
  parties: Partial<Party>[];
  bankAccounts: TallyBankAccount[];
  cashInHand: number;
  expenseCategories: string[];
  salesVouchers: TallyVoucher[];
  purchaseVouchers: TallyVoucher[];
  paymentVouchers: TallyVoucher[];
  receiptVouchers: TallyVoucher[];
  journalVouchers: TallyVoucher[];
  creditNoteVouchers?: TallyVoucher[];
  debitNoteVouchers?: TallyVoucher[];
  companyName?: string;
  companyGstin?: string;
  totalEntities: number;
  warnings: string[];
  source: "xml" | "csv";
}

// ─── XML & Numeric Extraction Helpers ─────────────────────────────────────────

function getText(el: Element | null, tag: string): string {
  if (!el) return "";
  const child = el.querySelector(tag);
  return child?.textContent?.trim() ?? "";
}

function getAttr(el: Element | null, attr: string): string {
  if (!el) return "";
  return el.getAttribute(attr)?.trim() ?? "";
}

/**
 * Extracts a numeric value from strings that may contain currency symbols (₹, $, Rs),
 * commas, or trailing units (e.g. "100.00 PCS", "₹ 1,500.00/PCS", "-15,000.00 Dr").
 */
export function extractNumericValue(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹$,]/g, "").trim();
  const match = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!match) return 0;
  const val = parseFloat(match[0]);
  return isNaN(val) ? 0 : val;
}

function parseAmount(raw: string): number {
  return Math.abs(extractNumericValue(raw));
}

function parseTallyDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Tally date format: YYYYMMDD → YYYY-MM-DD
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  // If format is DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

function isCrBalance(raw: string): boolean {
  // Tally uses negative numbers or "Cr" suffix for payable (we owe them)
  const lower = raw.toLowerCase();
  return lower.includes("-") || lower.includes("cr");
}

function sanitizeGstRate(raw: string | number): GSTRate {
  const n = typeof raw === "number" ? raw : extractNumericValue(String(raw));
  const valid: GSTRate[] = [0, 0.1, 0.25, 3, 5, 12, 18, 28];
  return (valid.includes(n as GSTRate) ? n : 18) as GSTRate;
}

export function mapTallyUnit(raw: string): string {
  if (!raw) return "PCS";
  const clean = raw.replace(/[-+0-9.,\s/]/g, "").toUpperCase().trim();
  const map: Record<string, string> = {
    NOS: "NOS",
    NO: "NOS",
    PCS: "PCS",
    PC: "PCS",
    PIECES: "PCS",
    KGS: "KG",
    KG: "KG",
    KILOGRAM: "KG",
    LTR: "LTR",
    L: "LTR",
    LTS: "LTR",
    LITRE: "LTR",
    LITRES: "LTR",
    MTR: "MTR",
    M: "MTR",
    METER: "MTR",
    METERS: "MTR",
    BOX: "BOX",
    BOXES: "BOX",
    PKT: "PKT",
    PACK: "PKT",
    PACKET: "PKT",
    BAG: "BAG",
    BAGS: "BAG",
    CAN: "CAN",
    CANS: "CAN",
    BTL: "BTL",
    BOTTLE: "BTL",
    SET: "SET",
    SETS: "SET",
    GM: "GM",
    G: "GM",
    GMS: "GM",
    GRAM: "GM",
    ML: "ML",
    DOZ: "DOZ",
    DOZEN: "DOZ",
    SQFT: "SQFT",
    SQM: "SQM",
    ROLL: "ROLL",
    ROLLS: "ROLL",
    PAIR: "PAIR",
    PAIRS: "PAIR",
  };
  return map[clean] ?? "PCS";
}

// ─── Group Hierarchy Resolver ────────────────────────────────────────────────

function buildGroupHierarchy(doc: Document): Map<string, string> {
  const map = new Map<string, string>();
  const groupEls = doc.querySelectorAll("GROUP");
  groupEls.forEach((g) => {
    const name = (getAttr(g, "NAME") || getText(g, "NAME")).toLowerCase().trim();
    const parent = getText(g, "PARENT").toLowerCase().trim();
    if (name && parent) {
      map.set(name, parent);
    }
  });
  return map;
}

function resolveRootGroupType(
  groupName: string,
  hierarchy: Map<string, string>
): "customer" | "supplier" | "bank" | "cash" | "system" | "other" {
  let curr = groupName.toLowerCase().trim();
  let depth = 0;

  while (curr && depth < 12) {
    if (curr.includes("debtor") || curr.includes("customer") || curr.includes("receivable") || curr.includes("client")) {
      return "customer";
    }
    if (curr.includes("creditor") || curr.includes("supplier") || curr.includes("payable") || curr.includes("vendor")) {
      return "supplier";
    }
    if (curr.includes("bank") || curr.includes("occ") || curr.includes("od account") || curr.includes("overdraft")) {
      return "bank";
    }
    if (curr.includes("cash") && !curr.includes("discount")) {
      return "cash";
    }
    if (
      curr.includes("duty") || curr.includes("tax") || curr.includes("gst") ||
      curr.includes("sales account") || curr.includes("purchase account") ||
      curr.includes("capital") || curr.includes("reserves") || curr.includes("suspense") ||
      curr.includes("profit") || curr.includes("loss") || curr.includes("direct expense") ||
      curr.includes("indirect expense") || curr.includes("direct income") || curr.includes("indirect income")
    ) {
      return "system";
    }
    const next = hierarchy.get(curr);
    if (!next || next === curr) break;
    curr = next;
    depth++;
  }

  return "other";
}

function mapPartyCategory(parentGroup: string, hierarchy: Map<string, string>): string {
  const g = parentGroup.toLowerCase();
  if (g.includes("distributor")) return "Distributor";
  if (g.includes("manufacturer")) return "Manufacturer";
  if (g.includes("wholesal")) return "Wholesaler";
  if (g.includes("retail")) return "Retailer";
  if (g.includes("corporate") || g.includes("institutional")) return "Corporate";

  const rootType = resolveRootGroupType(parentGroup, hierarchy);
  if (rootType === "customer") return "Retailer";
  if (rootType === "supplier") return "Wholesaler";
  return parentGroup || "General";
}

// ─── XML Parsers ──────────────────────────────────────────────────────────────

function extractGstRateFromStockItem(el: Element): GSTRate {
  const gstEls = el.querySelectorAll("GSTDETAILS\\.LIST, GSTDETAILS, RATEDETAILS\\.LIST, RATEDETAILS");
  for (const g of Array.from(gstEls)) {
    const rateText = getText(g, "GSTRATE") || getText(g, "TAXRATE") || getText(g, "RATE");
    if (rateText) {
      const parsed = extractNumericValue(rateText);
      if (parsed > 0) return sanitizeGstRate(parsed);
    }
    const dutyHead = getText(g, "GSTRATEDUTYHEAD").toLowerCase();
    if (dutyHead.includes("integrated") && rateText) {
      return sanitizeGstRate(rateText);
    }
    if ((dutyHead.includes("central") || dutyHead.includes("cgst")) && rateText) {
      const halfRate = extractNumericValue(rateText);
      if (halfRate > 0) return sanitizeGstRate(halfRate * 2);
    }
  }

  const taxClass = (getText(el, "TAXCLASSIFICATIONNAME") || getText(el, "GSTAPPLICABLE")).toLowerCase();
  const match = taxClass.match(/\b(0\.1|0\.25|3|5|12|18|28)\s*%/);
  if (match) {
    return sanitizeGstRate(match[1]);
  }

  const directRate = getText(el, "GSTRATE") || getText(el, "TAXRATE");
  if (directRate) {
    return sanitizeGstRate(directRate);
  }

  return 18;
}

function extractStockRates(el: Element): { purchasePrice: number; sellingPrice: number; mrp: number } {
  let purchasePrice = 0;
  const costEl = el.querySelector("STANDARDCOSTLIST\\.LIST, STANDARDCOSTLIST");
  if (costEl) {
    purchasePrice = Math.abs(extractNumericValue(getText(costEl, "RATE")));
  }
  if (purchasePrice === 0) {
    const openingRateRaw = getText(el, "OPENINGRATE");
    purchasePrice = Math.abs(extractNumericValue(openingRateRaw));
  }

  let sellingPrice = 0;
  const priceEl = el.querySelector("STANDARDPRICELIST\\.LIST, STANDARDPRICELIST");
  if (priceEl) {
    sellingPrice = Math.abs(extractNumericValue(getText(priceEl, "RATE")));
  }

  if (sellingPrice === 0 && purchasePrice > 0) {
    sellingPrice = Math.round(purchasePrice * 1.15);
  } else if (purchasePrice === 0 && sellingPrice > 0) {
    purchasePrice = Math.round(sellingPrice * 0.8);
  }

  const mrp = sellingPrice > 0 ? Math.round(sellingPrice * 1.05) : purchasePrice > 0 ? Math.round(purchasePrice * 1.2) : 0;

  return { purchasePrice, sellingPrice, mrp };
}

function parseStockItems(doc: Document): Partial<InventoryItem>[] {
  const items: Partial<InventoryItem>[] = [];
  const stockItemEls = doc.querySelectorAll("STOCKITEM");

  stockItemEls.forEach((el, idx) => {
    const name = getAttr(el, "NAME") || getText(el, "NAME");
    if (!name) return;

    const unit = mapTallyUnit(getText(el, "BASEUNITS"));
    const openingBalanceRaw = getText(el, "OPENINGBALANCE");
    const openingStock = Math.abs(extractNumericValue(openingBalanceRaw));

    const { purchasePrice, sellingPrice, mrp } = extractStockRates(el);

    // HSN from HSNDETAILS.LIST or direct
    const hsnEl = el.querySelector("HSNDETAILS\\.LIST, HSNDETAILS");
    const hsnCode = hsnEl ? (getText(hsnEl, "HSNCODE") || getText(hsnEl, "HSN") || "") : getText(el, "HSNCODE") || "";

    // GST Rate
    const gstRate = extractGstRateFromStockItem(el);

    // Category / Group
    const parent = getText(el, "PARENT") || "General";

    // Barcode / SKU / Part No
    const partNo = getText(el, "PARTNO");
    const mailingName = getText(el.querySelector("MAILINGNAME\\.LIST, MAILINGNAME"), "MAILINGNAME") || getText(el, "MAILINGNAME");
    const barcode = getText(el, "BARCODE") || (partNo && /^[0-9]{8,14}$/.test(partNo) ? partNo : null);
    const sku = partNo || `TLY-${name.substring(0, 6).replace(/[^A-Za-z0-9]/g, "").toUpperCase()}-${String(idx + 1).padStart(4, "0")}`;

    // Description
    const description = getText(el, "DESCRIPTION") || null;

    items.push({
      name,
      sku,
      barcode: barcode || null,
      category: parent,
      brand: null,
      unit: unit as InventoryItem["unit"],
      sellingPrice,
      purchasePrice,
      mrp,
      gstRate,
      hsnCode: hsnCode ? hsnCode.trim() : null,
      openingStock,
      currentStock: openingStock,
      minStockAlert: Math.max(1, Math.floor(openingStock * 0.1)),
      isLowStock: false,
      batches: [],
      ...(description ? { description } : {}),
    });
  });

  return items;
}

function parseLedgers(doc: Document, hierarchy: Map<string, string>): Partial<Party>[] {
  const parties: Partial<Party>[] = [];
  const ledgerEls = doc.querySelectorAll("LEDGER");

  ledgerEls.forEach((el) => {
    const name = getAttr(el, "NAME") || getText(el, "NAME");
    if (!name) return;

    const parent = getText(el, "PARENT") || "";
    const rootType = resolveRootGroupType(parent, hierarchy);

    // Filter out system, cash, bank ledgers
    if (rootType !== "customer" && rootType !== "supplier" && rootType !== "other") {
      return;
    }

    // If "other", check if it contains debtor or creditor
    if (rootType === "other") {
      const pLow = parent.toLowerCase();
      if (!pLow.includes("debtor") && !pLow.includes("creditor") && !pLow.includes("party")) {
        return;
      }
    }

    // Multi-line address support
    const addressParts: string[] = [];
    const addressEls = el.querySelectorAll("ADDRESS, BILLINGADDRESS");
    addressEls.forEach((a) => {
      if (a.children.length === 0) {
        const text = a.textContent?.trim().replace(/\s+/g, " ");
        if (text && !addressParts.includes(text)) addressParts.push(text);
      }
    });
    if (addressParts.length === 0) {
      const listEl = el.querySelector("ADDRESS\\.LIST, ADDRESSLIST");
      if (listEl) {
        const lines = (listEl.textContent || "")
          .split(/\r?\n/)
          .map((l) => l.trim().replace(/\s+/g, " "))
          .filter(Boolean);
        lines.forEach((l) => {
          if (!addressParts.includes(l)) addressParts.push(l);
        });
      }
    }
    const address = addressParts.join(", ");

    // Opening Balance & Polarity
    const openingRaw = getText(el, "OPENINGBALANCE");
    const isDeemedPositive = getText(el, "ISDEEMEDPOSITIVE").toLowerCase();
    const isCr = isDeemedPositive === "no" || isCrBalance(openingRaw);
    const openingBalance = parseAmount(openingRaw);

    // In CredSmart: positive = receivable (Dr), negative = payable (Cr)
    let balance = isCr ? -openingBalance : openingBalance;
    const partyType: "customer" | "supplier" | "both" = rootType === "supplier" ? "supplier" : "customer";

    // If party is supplier with unassigned sign but standard credit balance
    if (partyType === "supplier" && openingBalance > 0 && balance > 0 && !isDeemedPositive) {
      balance = -openingBalance;
    }

    const gstin = getText(el, "PARTYGSTIN") || getText(el, "GSTIN") || getText(el, "GSTREGISTRATIONNO") || "";
    const pan = getText(el, "PAN") || getText(el, "PANNUMBER") || (gstin.length >= 12 ? gstin.substring(2, 12) : "");
    const phone = getText(el, "LEDGERMOBILE") || getText(el, "MOBILEPHONE") || getText(el, "PHONE") || getText(el, "LEDGERPHONE") || "";
    const email = getText(el, "EMAIL") || getText(el, "EMAILID") || "";
    const pincode = getText(el, "PINCODE") || getText(el, "ZIP") || "";
    const state = getText(el, "STATENAME") || getText(el, "LEDSTATE") || "";
    const city = getText(el, "CITY") || "";
    const creditLimit = parseAmount(getText(el, "CREDITLIMIT") || "0");
    const creditDays = parseInt(getText(el, "CREDITPERIOD") || getText(el, "BILLCREDITPERIOD") || "0", 10) || 0;
    const category = mapPartyCategory(parent, hierarchy);

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

function parseAllVouchers(doc: Document): {
  salesVouchers: TallyVoucher[];
  purchaseVouchers: TallyVoucher[];
  paymentVouchers: TallyVoucher[];
  receiptVouchers: TallyVoucher[];
  journalVouchers: TallyVoucher[];
  creditNoteVouchers: TallyVoucher[];
  debitNoteVouchers: TallyVoucher[];
} {
  const salesVouchers: TallyVoucher[] = [];
  const purchaseVouchers: TallyVoucher[] = [];
  const paymentVouchers: TallyVoucher[] = [];
  const receiptVouchers: TallyVoucher[] = [];
  const journalVouchers: TallyVoucher[] = [];
  const creditNoteVouchers: TallyVoucher[] = [];
  const debitNoteVouchers: TallyVoucher[] = [];

  const voucherEls = doc.querySelectorAll("VOUCHER");

  voucherEls.forEach((el) => {
    const vchTypeRaw = getAttr(el, "VCHTYPE") || getText(el, "VOUCHERTYPENAME");
    if (!vchTypeRaw) return;

    const lowerType = vchTypeRaw.toLowerCase();
    const dateRaw = getText(el, "DATE");
    const voucherNumber = getText(el, "VOUCHERNUMBER") || getText(el, "ALTEREDON") || `VCH-${Date.now()}`;
    const partyName = getText(el, "PARTYLEDGERNAME") || getText(el, "BASICBUYERNAME") || getText(el, "PARTYNAME") || "";
    const partyGstin = getText(el, "PARTYGSTIN") || "";
    const placeOfSupply = getText(el, "PLACEOFSUPPLY") || "";
    const narration = getText(el, "NARRATION") || "";

    // Parse Inventory Line Items
    const items: TallyVoucherItem[] = [];
    const invEls = el.querySelectorAll("ALLINVENTORYENTRIES\\.LIST, INVENTORYENTRIES\\.LIST, ALLINVENTORYENTRIES");
    invEls.forEach((inv) => {
      const itemName = getText(inv, "STOCKITEMNAME");
      if (!itemName) return;

      const qtyRaw = getText(inv, "ACTUALQTY") || getText(inv, "BILLEDQTY");
      const quantity = Math.abs(extractNumericValue(qtyRaw)) || 1;
      const unit = mapTallyUnit(qtyRaw);
      const rate = Math.abs(extractNumericValue(getText(inv, "RATE")));
      const amount = Math.abs(extractNumericValue(getText(inv, "AMOUNT"))) || (quantity * rate);
      const discount = Math.abs(extractNumericValue(getText(inv, "DISCOUNT")));

      const batchEl = inv.querySelector("BATCHALLOCATIONS\\.LIST, BATCHALLOCATIONS");
      const batchNumber = batchEl ? getText(batchEl, "BATCHNAME") : undefined;
      const rawExp = batchEl ? (getText(batchEl, "EXPIRYDATE") || getText(batchEl, "EXPIRYPERIOD")) : "";
      const expiryDate = rawExp ? parseTallyDate(rawExp) : undefined;
      const godown = batchEl ? getText(batchEl, "GODOWNNAME") : undefined;

      items.push({
        itemName,
        quantity,
        unit,
        rate,
        amount,
        discountPercent: discount,
        batchNumber: batchNumber || undefined,
        expiryDate: expiryDate || undefined,
        godown: godown || undefined,
      });
    });

    // Parse Ledger Entries
    const ledgerEntries: TallyLedgerEntry[] = [];
    let totalAmount = 0;
    const ledgerEls = el.querySelectorAll("ALLLEDGERENTRIES\\.LIST, LEDGERENTRIES\\.LIST, ALLLEDGERENTRIES");
    ledgerEls.forEach((entry) => {
      const ledgerName = getText(entry, "LEDGERNAME");
      const amountRaw = getText(entry, "AMOUNT");
      const isDr = !amountRaw.includes("-");
      const amount = parseAmount(amountRaw);

      if (ledgerName && amount > 0) {
        ledgerEntries.push({ ledgerName, amount, isDr });
        // Party or Net Invoice Amount
        const isTaxOrDiscount =
          ledgerName.toLowerCase().includes("gst") ||
          ledgerName.toLowerCase().includes("tax") ||
          ledgerName.toLowerCase().includes("round") ||
          ledgerName.toLowerCase().includes("discount");

        if (!isTaxOrDiscount) {
          totalAmount = Math.max(totalAmount, amount);
        }
      }
    });

    if (totalAmount === 0 && items.length > 0) {
      totalAmount = items.reduce((sum, it) => sum + it.amount, 0);
    }

    const voucher: TallyVoucher = {
      voucherNumber,
      date: parseTallyDate(dateRaw),
      voucherType: "Sales",
      partyName: partyName || "Cash / General",
      partyGstin: partyGstin || undefined,
      placeOfSupply: placeOfSupply || undefined,
      amount: totalAmount,
      narration: narration || undefined,
      ledgerEntries,
      items: items.length > 0 ? items : undefined,
    };

    // Classify voucher
    if (lowerType.includes("credit note") || lowerType.includes("sales return")) {
      voucher.voucherType = "Credit Note";
      creditNoteVouchers.push(voucher);
    } else if (lowerType.includes("debit note") || lowerType.includes("purchase return")) {
      voucher.voucherType = "Debit Note";
      debitNoteVouchers.push(voucher);
    } else if (lowerType.includes("sale") || lowerType.includes("tax invoice") || lowerType.includes("retail invoice")) {
      voucher.voucherType = "Sales";
      salesVouchers.push(voucher);
    } else if (lowerType.includes("purchase")) {
      voucher.voucherType = "Purchase";
      purchaseVouchers.push(voucher);
    } else if (lowerType.includes("receipt")) {
      voucher.voucherType = "Receipt";
      receiptVouchers.push(voucher);
    } else if (lowerType.includes("payment")) {
      voucher.voucherType = "Payment";
      paymentVouchers.push(voucher);
    } else if (lowerType.includes("journal")) {
      voucher.voucherType = "Journal";
      journalVouchers.push(voucher);
    }
  });

  return {
    salesVouchers,
    purchaseVouchers,
    paymentVouchers,
    receiptVouchers,
    journalVouchers,
    creditNoteVouchers,
    debitNoteVouchers,
  };
}

function parseBankAndCashAccounts(
  doc: Document,
  hierarchy: Map<string, string>
): {
  bankAccounts: TallyBankAccount[];
  cashInHand: number;
  expenseCategories: string[];
} {
  const bankAccounts: TallyBankAccount[] = [];
  let cashInHand = 0;
  const expenseCategories: string[] = [];
  const ledgerEls = doc.querySelectorAll("LEDGER");

  ledgerEls.forEach((el) => {
    const name = getAttr(el, "NAME") || getText(el, "NAME");
    if (!name) return;
    const parent = getText(el, "PARENT") || "";
    const rootType = resolveRootGroupType(parent, hierarchy);

    const openingRaw = getText(el, "OPENINGBALANCE");
    const bal = parseAmount(openingRaw);

    if (rootType === "bank") {
      const bankDetails = el.querySelector("BANKDETAILS, BANKDETAILS\\.LIST");
      const accNum = bankDetails
        ? (getText(bankDetails, "ACCOUNTNUMBER") || getText(bankDetails, "ACCNO"))
        : (getText(el, "BANKACCOUNTNUMBER") || getText(el, "ACCOUNTNUMBER") || "");
      const ifsc = bankDetails
        ? (getText(bankDetails, "IFSCODE") || getText(bankDetails, "IFSC"))
        : (getText(el, "IFSCODE") || getText(el, "IFSC") || "");
      bankAccounts.push({
        name,
        accountName: name,
        bankName: name.replace(/account|a\/c|current|savings|overdraft|occ/gi, "").trim() || "Bank Account",
        accountNumber: accNum || undefined,
        ifscCode: ifsc || undefined,
        ifsc: ifsc || undefined,
        balance: bal,
        isDr: bal >= 0,
      });
    } else if (rootType === "cash") {
      cashInHand += bal;
    } else if (rootType === "system") {
      const pLow = parent.toLowerCase();
      if (pLow.includes("expense") || pLow.includes("exp")) {
        expenseCategories.push(name);
      }
    }
  });

  return { bankAccounts, cashInHand, expenseCategories };
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
  } catch {
    throw new Error("Failed to parse Tally XML file. Please ensure you exported a valid XML from Tally Prime or ERP 9.");
  }

  // 1. Build Group Hierarchy
  const groupHierarchy = buildGroupHierarchy(doc);

  // 2. Parse Entities
  const items = parseStockItems(doc);
  const parties = parseLedgers(doc, groupHierarchy);
  const { bankAccounts, cashInHand, expenseCategories } = parseBankAndCashAccounts(doc, groupHierarchy);
  const vouchers = parseAllVouchers(doc);
  const company = parseCompanyMaster(doc);

  const totalVouchers =
    vouchers.salesVouchers.length +
    vouchers.purchaseVouchers.length +
    vouchers.paymentVouchers.length +
    vouchers.receiptVouchers.length +
    vouchers.journalVouchers.length +
    vouchers.creditNoteVouchers.length +
    vouchers.debitNoteVouchers.length;

  if (items.length === 0 && parties.length === 0 && bankAccounts.length === 0 && totalVouchers === 0) {
    warnings.push("No recognizable Tally entities found in this XML file. Ensure you exported Stock Items or Ledger data from Tally.");
  }

  return {
    items,
    parties,
    bankAccounts,
    cashInHand,
    expenseCategories,
    salesVouchers: vouchers.salesVouchers,
    purchaseVouchers: vouchers.purchaseVouchers,
    paymentVouchers: vouchers.paymentVouchers,
    receiptVouchers: vouchers.receiptVouchers,
    journalVouchers: vouchers.journalVouchers,
    creditNoteVouchers: vouchers.creditNoteVouchers,
    debitNoteVouchers: vouchers.debitNoteVouchers,
    companyName: company.name,
    companyGstin: company.gstin,
    totalEntities: items.length + parties.length + bankAccounts.length + totalVouchers,
    warnings,
    source: "xml",
  };
}

// ─── Tally CSV / Daybook Parsers ─────────────────────────────────────────────

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

  const idx = {
    name: findCol(["stockitemname", "itemname", "name", "stockitem", "item"]),
    group: findCol(["group", "category", "parent", "under"]),
    unit: findCol(["unit", "uom", "baseunit"]),
    openingQty: findCol(["closingbalance", "openingbalance", "closingqty", "qty", "quantity", "balance"]),
    rate: findCol(["rate", "mrp", "price", "costprice", "purchaseprice", "openingrate"]),
    hsn: findCol(["hsn", "hsncode", "hsnsac"]),
    gst: findCol(["gstrate", "gst", "taxrate", "tax"]),
    partNo: findCol(["partno", "sku", "code", "barcode"]),
  };

  if (idx.name === -1) return [];

  const items: Partial<InventoryItem>[] = [];
  lines.slice(1).forEach((line, lineIdx) => {
    const cols = parseTallyLine(line);
    if (!cols[idx.name]) return;

    const name = cols[idx.name]?.trim();
    if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "grand total") return;

    const unit = mapTallyUnit(idx.unit >= 0 ? cols[idx.unit] : "PCS");
    const openingStock = Math.abs(extractNumericValue(idx.openingQty >= 0 ? cols[idx.openingQty] : "0"));
    const purchasePrice = parseAmount(idx.rate >= 0 ? cols[idx.rate] : "0");
    const gstRate = sanitizeGstRate(idx.gst >= 0 ? cols[idx.gst] : "18");
    const hsnCode = idx.hsn >= 0 ? cols[idx.hsn]?.trim() : "";
    const category = idx.group >= 0 ? cols[idx.group]?.trim() : "General";
    const partNo = idx.partNo >= 0 ? cols[idx.partNo]?.trim() : "";

    items.push({
      name,
      sku: partNo || `TLY-${name.substring(0, 6).replace(/[^A-Za-z0-9]/g, "").toUpperCase()}-${String(lineIdx + 1).padStart(4, "0")}`,
      barcode: partNo && /^[0-9]{8,14}$/.test(partNo) ? partNo : null,
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
    if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "grand total") return;

    const parent = (idx.parent >= 0 ? cols[idx.parent] : "")?.toLowerCase() ?? "";
    const isSystem = systemGroups.some((g) => parent.includes(g)) && !parent.includes("debtor") && !parent.includes("creditor");
    if (isSystem) return;

    const openingRaw = (idx.openingBalance >= 0 ? cols[idx.openingBalance] : "0") ?? "0";
    const drCr = (idx.drCr >= 0 ? cols[idx.drCr] : "")?.toLowerCase() ?? "";
    const openingAmt = parseAmount(openingRaw);
    const isCr = drCr.includes("cr") || isCrBalance(openingRaw);
    const balance = isCr ? -openingAmt : openingAmt;

    const isSupplier = parent.includes("creditor") || parent.includes("supplier") || parent.includes("vendor");

    parties.push({
      name,
      tradeName: name,
      phone: (idx.phone >= 0 ? cols[idx.phone] : null)?.trim() || null,
      email: (idx.email >= 0 ? cols[idx.email] : null)?.trim() || null,
      partyType: isSupplier ? "supplier" : "customer",
      category: isSupplier ? "Wholesaler" : "Retailer",
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

/**
 * Parses Tally Daybook exports in CSV format
 * Columns usually: Date, Particulars, Vch Type, Vch No., Debit Amount, Credit Amount
 */
export function parseTallyDaybookCsv(csvText: string): TallyVoucher[] {
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

  const idx = {
    date: findCol(["date", "voucherdate"]),
    particulars: findCol(["particulars", "party", "account", "name", "ledger"]),
    vchType: findCol(["vchtype", "vouchertype", "type"]),
    vchNo: findCol(["vchno", "voucherno", "invoiceno", "billno"]),
    amount: findCol(["grosstotal", "amount", "total", "netamount", "totalamount", "value", "val"]),
    debit: findCol(["debit", "debitamount", "dr"]),
    credit: findCol(["credit", "creditamount", "cr"]),
    narration: findCol(["narration", "remarks", "note", "desc", "description"]),
  };

  if (idx.particulars === -1 || idx.vchType === -1) return [];

  const vouchers: TallyVoucher[] = [];
  lines.slice(1).forEach((line, i) => {
    const cols = parseTallyLine(line);
    const partyName = cols[idx.particulars]?.trim();
    const typeStr = cols[idx.vchType]?.trim();
    if (!partyName || !typeStr || partyName.toLowerCase() === "total") return;

    const date = parseTallyDate(idx.date >= 0 ? cols[idx.date] : "");
    const vchNo = (idx.vchNo >= 0 ? cols[idx.vchNo]?.trim() : "") || `DAY-${i + 1}`;
    const directAmt = idx.amount >= 0 ? parseAmount(cols[idx.amount]) : 0;
    const debit = idx.debit >= 0 ? parseAmount(cols[idx.debit]) : 0;
    const credit = idx.credit >= 0 ? parseAmount(cols[idx.credit]) : 0;
    const amount = directAmt > 0 ? directAmt : Math.max(debit, credit);
    const narration = (idx.narration >= 0 ? cols[idx.narration]?.trim() : "") || undefined;

    let vchType: TallyVoucher["voucherType"] = "Sales";
    const lowerType = typeStr.toLowerCase();
    if (lowerType.includes("sale")) vchType = "Sales";
    else if (lowerType.includes("purchase")) vchType = "Purchase";
    else if (lowerType.includes("receipt")) vchType = "Receipt";
    else if (lowerType.includes("payment")) vchType = "Payment";
    else if (lowerType.includes("credit note")) vchType = "Credit Note";
    else if (lowerType.includes("debit note")) vchType = "Debit Note";
    else vchType = "Journal";

    vouchers.push({
      voucherNumber: vchNo,
      date,
      voucherType: vchType,
      partyName,
      amount,
      narration,
      ledgerEntries: [
        { ledgerName: partyName, amount, isDr: debit > 0 },
      ],
    });
  });

  return vouchers;
}

// ─── Auto-detect and parse ───────────────────────────────────────────────────

export function autoDetectAndParseTally(content: string, filename: string = ""): TallyParseResult {
  const isXml = (filename || "").toLowerCase().endsWith(".xml") || content.trimStart().startsWith("<");

  if (isXml) {
    return parseTallyXml(content);
  }

  // Check if Daybook CSV
  const firstLine = content.split(/\r?\n/)[0]?.toLowerCase() ?? "";
  const isDaybook =
    firstLine.includes("vch type") ||
    firstLine.includes("vch no") ||
    (firstLine.includes("particulars") && firstLine.includes("debit"));

  if (isDaybook) {
    const vouchers = parseTallyDaybookCsv(content);
    return {
      items: [],
      parties: [],
      bankAccounts: [],
      cashInHand: 0,
      expenseCategories: [],
      salesVouchers: vouchers.filter((v) => v.voucherType === "Sales"),
      purchaseVouchers: vouchers.filter((v) => v.voucherType === "Purchase"),
      paymentVouchers: vouchers.filter((v) => v.voucherType === "Payment"),
      receiptVouchers: vouchers.filter((v) => v.voucherType === "Receipt"),
      journalVouchers: vouchers.filter((v) => v.voucherType === "Journal"),
      creditNoteVouchers: vouchers.filter((v) => v.voucherType === "Credit Note"),
      debitNoteVouchers: vouchers.filter((v) => v.voucherType === "Debit Note"),
      totalEntities: vouchers.length,
      warnings: vouchers.length === 0 ? ["No vouchers detected in Daybook CSV."] : [],
      source: "csv",
    };
  }

  const isLedger =
    firstLine.includes("ledger") ||
    firstLine.includes("debtor") ||
    firstLine.includes("creditor") ||
    firstLine.includes("gstin") ||
    firstLine.includes("opening balance");

  const items = isLedger ? [] : parseTallyStockCsv(content);
  const parties = isLedger ? parseTallyLedgerCsv(content) : [];

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
    bankAccounts: [],
    cashInHand: 0,
    expenseCategories: [],
    salesVouchers: [],
    purchaseVouchers: [],
    paymentVouchers: [],
    receiptVouchers: [],
    journalVouchers: [],
    totalEntities: finalItems.length + finalParties.length,
    warnings,
    source: "csv",
  };
}
