import { Party, PartyCustomItem } from "@/types/parties";
import { InventoryItem } from "@/types/inventory";

// CSV download trigger helper
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// PARTIES EXPORT & TEMPLATE
// -------------------------------------------------------------

export function generatePartiesSampleCSV(): string {
  const headers = [
    "Party Name*",
    "Party Type* (Customer/Supplier/Both)",
    "Mobile Number*",
    "Category",
    "GSTIN",
    "PAN",
    "Email",
    "Billing Address",
    "City",
    "State",
    "Pincode",
    "Opening Balance",
    "Balance Type (To Collect/To Pay)",
    "Credit Limit",
    "Credit Period (Days)",
  ];

  const sampleRows = [
    [
      "Shree Balaji Traders",
      "Customer",
      "9876543210",
      "Wholesaler",
      "27AAPFU0939F1ZV",
      "AAPFU0939F",
      "balaji@gmail.com",
      "Shop 4, Market Yard",
      "Mumbai",
      "Maharashtra",
      "400001",
      "15000",
      "To Collect",
      "50000",
      "30",
    ],
    [
      "Rajesh Enterprises",
      "Supplier",
      "9823011223",
      "Distributor",
      "24AABCA1234F1ZA",
      "AABCA1234F",
      "rajesh.dist@gmail.com",
      "Plot 12, GIDC",
      "Ahmedabad",
      "Gujarat",
      "380001",
      "8500",
      "To Pay",
      "100000",
      "45",
    ],
    [
      "Modern Retail Store",
      "Both",
      "9988776655",
      "Retailer",
      "",
      "",
      "modern@retail.in",
      "MG Road, Near Bus Stand",
      "Pune",
      "Maharashtra",
      "411001",
      "0",
      "To Collect",
      "25000",
      "15",
    ],
  ];

  return [headers.join(","), ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
}

export function exportPartiesToCSV(parties: Party[]): string {
  const headers = [
    "ID",
    "Party Name",
    "Type",
    "Category",
    "Mobile Number",
    "Email",
    "GSTIN",
    "PAN",
    "City",
    "State",
    "Address",
    "Current Balance (₹)",
    "Balance Status",
    "Credit Limit (₹)",
    "Credit Period (Days)",
    "Created Date",
  ];

  const rows = parties.map((p) => [
    p.id,
    p.name,
    p.partyType.toUpperCase(),
    p.category || "General",
    p.phone || "",
    p.email || "",
    p.gstin || "",
    p.pan || "",
    p.city || "",
    p.state || "",
    p.address || "",
    Math.abs(p.balance).toString(),
    p.balance > 0 ? "To Collect (Dr)" : p.balance < 0 ? "To Pay (Cr)" : "Settled",
    p.creditLimit ? p.creditLimit.toString() : "0",
    p.creditPeriodDays ? p.creditPeriodDays.toString() : "0",
    new Date(p.created_at).toLocaleDateString("en-IN"),
  ]);

  return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
}

export function parsePartiesCSV(csvText: string): Partial<Party>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const results: Partial<Party>[] = [];

  // simple CSV tokenizer handling quotes
  const parseLine = (line: string): string[] => {
    const tokens: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        tokens.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    tokens.push(cur.trim());
    return tokens;
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (!cols || cols.length === 0 || !cols[0]) continue;

    const name = cols[0];
    const rawType = (cols[1] || "").toLowerCase();
    const partyType = rawType.includes("supp") ? "supplier" : rawType.includes("both") ? "both" : "customer";
    const phone = cols[2] || "";
    const category = cols[3] || "General";
    const gstin = cols[4] || "";
    const pan = cols[5] || "";
    const email = cols[6] || "";
    const address = cols[7] || "";
    const city = cols[8] || "";
    const state = cols[9] || "";
    const pincode = cols[10] || "";
    const rawBalance = parseFloat(cols[11] || "0") || 0;
    const balanceType = (cols[12] || "").toLowerCase();
    const balance = balanceType.includes("pay") ? -Math.abs(rawBalance) : Math.abs(rawBalance);
    const creditLimit = parseFloat(cols[13] || "0") || 0;
    const creditPeriodDays = parseInt(cols[14] || "0", 10) || 0;

    results.push({
      name,
      partyType,
      phone: phone || null,
      category,
      gstin: gstin || null,
      pan: pan || null,
      email: email || null,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      openingBalance: balance,
      balance,
      creditLimit,
      creditPeriodDays,
      sharedLedgerEnabled: false,
    });
  }

  return results;
}

// -------------------------------------------------------------
// ITEMS EXPORT & TEMPLATE
// -------------------------------------------------------------

export function generateItemsSampleCSV(): string {
  const headers = [
    "Item Name*",
    "SKU Code",
    "Barcode",
    "Category*",
    "Brand",
    "Primary Unit* (PCS/KG/LTR/BOX/NOS)",
    "Selling Price (₹)*",
    "Purchase Price (₹)*",
    "MRP (₹)",
    "GST Rate (%)",
    "HSN Code",
    "Opening Stock QTY",
    "Low Stock Alert QTY",
    "Batch Number",
    "Expiry Date (YYYY-MM-DD)",
  ];

  const sampleRows = [
    [
      "Amul Pure Ghee 1L Pouch",
      "AML-GHEE-1L",
      "8901262010123",
      "Dairy",
      "Amul",
      "LTR",
      "590",
      "520",
      "610",
      "5",
      "0402",
      "40",
      "10",
      "GHEE-B01",
      "2026-12-31",
    ],
    [
      "Tata Salt Vacuum Evaporated 1kg",
      "TAT-SALT-1K",
      "8901030615863",
      "Grocery",
      "Tata",
      "KG",
      "28",
      "22",
      "30",
      "5",
      "1006",
      "150",
      "25",
      "SALT-A22",
      "2027-06-30",
    ],
    [
      "Dettol Antiseptic Liquid 500ml",
      "DET-LIQ-500",
      "8901058851403",
      "Hygiene",
      "Dettol",
      "BTL",
      "195",
      "160",
      "210",
      "18",
      "3808",
      "65",
      "12",
      "DET-99A",
      "2028-03-31",
    ],
  ];

  return [headers.join(","), ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
}

export function exportItemsToCSV(items: InventoryItem[]): string {
  const headers = [
    "Item Name",
    "SKU Code",
    "Barcode",
    "Category",
    "Brand",
    "Stock QTY",
    "Unit",
    "Selling Price (₹)",
    "Purchase Price (₹)",
    "MRP (₹)",
    "GST Rate (%)",
    "HSN Code",
    "Low Stock Threshold",
    "Total Stock Valuation (₹)",
    "Status",
  ];

  const rows = items.map((item) => [
    item.name,
    item.sku,
    item.barcode || "",
    item.category || "General",
    item.brand || "",
    item.currentStock.toString(),
    item.unit,
    item.sellingPrice.toString(),
    item.purchasePrice.toString(),
    item.mrp.toString(),
    item.gstRate.toString(),
    item.hsnCode || "",
    item.minStockAlert.toString(),
    (item.currentStock * item.purchasePrice).toString(),
    item.currentStock <= 0 ? "Out of Stock" : item.isLowStock ? "Low Stock" : "In Stock",
  ]);

  return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
}

export function parseItemsCSV(csvText: string): Partial<InventoryItem>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const results: Partial<InventoryItem>[] = [];

  const parseLine = (line: string): string[] => {
    const tokens: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        tokens.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    tokens.push(cur.trim());
    return tokens;
  };

  // Header-aware parser: map columns by header names so order is flexible
  const headerTokens = parseLine(lines[0] || "");
  const normalized = headerTokens.map((h) => (h || "").replace(/\*/g, "").toLowerCase().trim());

  const requiredKeywords = ["item name", "selling price", "unit", "category"];
  const missing = requiredKeywords.filter((k) => !normalized.some((t) => t.includes(k)));
  if (missing.length > 0) {
    throw new Error(
      `CSV header mismatch. Missing required columns: ${missing.join(", ")}. Please download the sample template and ensure your file headers match.`
    );
  }

  const findIndexByKeywords = (keys: string[]) => {
    for (let i = 0; i < normalized.length; i++) {
      for (const k of keys) {
        if (normalized[i].includes(k)) return i;
      }
    }
    return -1;
  };

  const idx: Record<string, number> = {
    name: findIndexByKeywords(["item name", "item"]),
    sku: findIndexByKeywords(["sku"]),
    barcode: findIndexByKeywords(["barcode"]),
    category: findIndexByKeywords(["category"]),
    brand: findIndexByKeywords(["brand"]),
    unit: findIndexByKeywords(["unit", "primary unit"]),
    sellingPrice: findIndexByKeywords(["selling price", "selling", "price"]),
    purchasePrice: findIndexByKeywords(["purchase price", "cost price", "purchase"]),
    mrp: findIndexByKeywords(["mrp"]),
    gstRate: findIndexByKeywords(["gst", "gst rate", "tax rate"]),
    hsnCode: findIndexByKeywords(["hsn"]),
    openingStock: findIndexByKeywords(["opening stock", "stock", "stock qty", "opening stock qty"]),
    minStockAlert: findIndexByKeywords(["low stock", "min stock", "low stock alert", "low stock threshold"]),
    batchNumber: findIndexByKeywords(["batch"]),
    expiryDate: findIndexByKeywords(["expiry", "expiry date", "expiry_date"]),
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (!cols || cols.length === 0 || !cols[idx.name]) continue;

    const get = (index: number, defaultValue: string | number | null = "") => {
      if (index >= 0 && index < cols.length) return cols[index];
      return defaultValue;
    };

    const name = (get(idx.name, "") as string).trim();
    const sku = ((get(idx.sku) as string) || `SKU-${Math.floor(100000 + Math.random() * 900000)}`).trim();
    const barcode = (get(idx.barcode, "") as string) || null;
    const category = (get(idx.category, "General") as string) || "General";
    const brand = (get(idx.brand, "") as string) || null;
    const unit: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = ((get(idx.unit, "PCS") as string) || "PCS").toUpperCase(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const sellingPrice = parseFloat(String(get(idx.sellingPrice, "0"))) || 0;
    const purchasePrice = parseFloat(String(get(idx.purchasePrice, "0"))) || 0;
    const mrp = parseFloat(String(get(idx.mrp, String(sellingPrice)))) || sellingPrice;
    const gstRate: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = parseFloat(String(get(idx.gstRate, "0"))) || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
    const hsnCode = (get(idx.hsnCode, "") as string) || null;
    const openingStock = parseFloat(String(get(idx.openingStock, "0"))) || 0;
    const minStockAlert = parseFloat(String(get(idx.minStockAlert, "5"))) || 5;
    const batchNumber = (get(idx.batchNumber, "DEFAULT") as string) || "DEFAULT";
    const expiryDate = (get(idx.expiryDate, "") as string) || null;

    results.push({
      name,
      sku,
      barcode,
      category,
      brand,
      unit,
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

  return results;
}

// -------------------------------------------------------------
// PARTY CUSTOM ITEMS EXPORT, SAMPLE & PARSER
// -------------------------------------------------------------

export function generatePartyCustomItemsSampleCSV(): string {
  const headers = [
    "Product Name*",
    "Custom Selling Price (₹)*",
    "Standard Catalogue Price (₹)",
    "SKU Code",
    "Barcode",
    "Category",
    "Unit",
    "GST Rate (%)",
    "HSN Code",
    "Notes",
  ];

  const sampleRows = [
    [
      "Amul Pure Ghee 1L Pouch",
      "550",
      "590",
      "AML-GHEE-1L",
      "8901262010123",
      "Dairy",
      "LTR",
      "5",
      "0402",
      "VIP Wholesale customer discount rate",
    ],
    [
      "Tata Salt Vacuum Evaporated 1kg",
      "25",
      "28",
      "TAT-SALT-1K",
      "8901030615863",
      "Grocery",
      "KG",
      "5",
      "1006",
      "Special bulk contract pricing",
    ],
    [
      "Fortune Sunlite Refined Sunflower Oil 1L",
      "135",
      "148",
      "FORT-SUN-1L",
      "8906007280123",
      "Edible Oil",
      "LTR",
      "5",
      "1512",
      "Quarterly locked agreement rate",
    ],
    [
      "Dettol Antiseptic Liquid 500ml",
      "180",
      "195",
      "DET-LIQ-500",
      "8901058851403",
      "Hygiene",
      "BTL",
      "18",
      "3808",
      "Distributor tier rate",
    ],
  ];

  return [headers.join(","), ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
}

export function exportPartyCustomItemsToCSV(items: PartyCustomItem[], partyName = "Party"): string {
  const headers = [
    "Product Name",
    "Custom Selling Price (₹)",
    "Standard Catalogue Price (₹)",
    "Price Difference (₹)",
    "SKU Code",
    "Barcode",
    "Category",
    "Unit",
    "GST Rate (%)",
    "HSN Code",
    "Notes",
  ];

  const rows = items.map((item) => {
    const diff = item.customPrice - item.standardPrice;
    return [
      item.productName,
      item.customPrice.toString(),
      item.standardPrice.toString(),
      diff > 0 ? `+${diff}` : `${diff}`,
      item.sku || "",
      item.barcode || "",
      item.category || "General",
      item.unit || "Pcs",
      (item.gstRate ?? 18).toString(),
      item.hsnCode || "",
      item.notes || "",
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
}

export interface ParsePartyCustomItemsResult {
  items: PartyCustomItem[];
  matchedCount: number;
  newCount: number;
  errors: string[];
}

export function parsePartyCustomItemsCSV(csvText: string, catalogProducts: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[] = []): ParsePartyCustomItemsResult { // eslint-disable-line @typescript-eslint/no-explicit-any
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { items: [], matchedCount: 0, newCount: 0, errors: [] };

  const parseLine = (line: string): string[] => {
    const tokens: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        tokens.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    tokens.push(cur.trim());
    return tokens;
  };

  const headerTokens = parseLine(lines[0] || "");
  const normalized = headerTokens.map((h) => (h || "").replace(/\*/g, "").toLowerCase().trim());

  const findIndexByKeywords = (keys: string[]) => {
    for (let i = 0; i < normalized.length; i++) {
      for (const k of keys) {
        if (normalized[i].includes(k)) return i;
      }
    }
    return -1;
  };

  const idx = {
    name: findIndexByKeywords(["product name", "item name", "product", "item"]),
    customPrice: findIndexByKeywords(["custom selling price", "custom price", "party price", "special price", "rate"]),
    standardPrice: findIndexByKeywords(["standard catalogue price", "standard price", "mrp", "catalogue price", "regular price"]),
    sku: findIndexByKeywords(["sku code", "sku"]),
    barcode: findIndexByKeywords(["barcode", "code", "ean", "upc"]),
    category: findIndexByKeywords(["category"]),
    unit: findIndexByKeywords(["unit", "uom"]),
    gstRate: findIndexByKeywords(["gst rate", "gst", "tax"]),
    hsnCode: findIndexByKeywords(["hsn code", "hsn"]),
    notes: findIndexByKeywords(["notes", "remark", "comment"]),
  };

  if (idx.name === -1 && idx.customPrice === -1) {
    throw new Error(
      "CSV header mismatch. Could not identify Product Name or Custom Price column. Please download the sample template and try again."
    );
  }

  const items: PartyCustomItem[] = [];
  let matchedCount = 0;
  let newCount = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (!cols || cols.length === 0) continue;

    const get = (index: number, defaultValue = "") => {
      if (index >= 0 && index < cols.length) return cols[index];
      return defaultValue;
    };

    const rawName = (get(idx.name, "") as string).trim();
    const rawCustomPrice = parseFloat(String(get(idx.customPrice, "0"))) || 0;
    const rawStandardPrice = parseFloat(String(get(idx.standardPrice, "0"))) || 0;
    const rawSku = ((get(idx.sku, "") as string) || "").trim();
    const rawBarcode = ((get(idx.barcode, "") as string) || "").trim();
    const rawCategory = ((get(idx.category, "General") as string) || "General").trim();
    const rawUnit = ((get(idx.unit, "Pcs") as string) || "Pcs").trim();
    const rawGstRate = parseFloat(String(get(idx.gstRate, "18"))) || 18;
    const rawHsnCode = ((get(idx.hsnCode, "") as string) || "").trim();
    const rawNotes = ((get(idx.notes, "") as string) || "").trim();

    if (!rawName && !rawSku && !rawBarcode) {
      errors.push(`Row ${i + 1}: Missing product identifier (Name, SKU, or Barcode)`);
      continue;
    }
    
    if (rawCustomPrice <= 0 && rawStandardPrice <= 0) {
      errors.push(`Row ${i + 1}: '${rawName || rawSku || rawBarcode}' has invalid or zero pricing`);
      continue;
    }

    // Search against catalogProducts by Barcode, SKU, or Name
    let matchedProduct: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (catalogProducts && catalogProducts.length > 0) {
      if (rawBarcode) {
        matchedProduct = catalogProducts.find((p) => (p.barcode || "").toLowerCase() === rawBarcode.toLowerCase());
      }
      if (!matchedProduct && rawSku) {
        matchedProduct = catalogProducts.find((p) => (p.sku || "").toLowerCase() === rawSku.toLowerCase());
      }
      if (!matchedProduct && rawName) {
        matchedProduct = catalogProducts.find((p) => (p.name || "").toLowerCase() === rawName.toLowerCase());
      }
    }

    if (matchedProduct) {
      matchedCount++;
      const tags = matchedProduct.tags || {};
      const catStandardPrice = tags && (tags.selling_price !== undefined && tags.selling_price !== null)
        ? Number(tags.selling_price)
        : (matchedProduct.product_batches?.[0]?.mrp || rawStandardPrice || rawCustomPrice);

      items.push({
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        category: matchedProduct.category || rawCategory,
        brand: matchedProduct.brand || undefined,
        sku: matchedProduct.sku || rawSku || undefined,
        barcode: matchedProduct.barcode || rawBarcode || undefined,
        unit: matchedProduct.unit || rawUnit,
        standardPrice: catStandardPrice,
        customPrice: rawCustomPrice > 0 ? rawCustomPrice : catStandardPrice,
        costPrice: matchedProduct.product_batches?.[0]?.cost_price || 0,
        gstRate: tags?.gst_rate !== undefined ? Number(tags.gst_rate) : rawGstRate,
        hsnCode: tags?.hsn_code || tags?.hsn || matchedProduct.hsn || rawHsnCode || undefined,
        notes: rawNotes || undefined,
        isActive: true,
      });
    } else {
      newCount++;
      const effectiveStandardPrice = rawStandardPrice > 0 ? rawStandardPrice : rawCustomPrice;
      items.push({
        productId: `custom-prod-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        productName: rawName || rawSku || rawBarcode || `Custom Item #${i}`,
        category: rawCategory,
        sku: rawSku || undefined,
        barcode: rawBarcode || undefined,
        unit: rawUnit,
        standardPrice: effectiveStandardPrice,
        customPrice: rawCustomPrice > 0 ? rawCustomPrice : effectiveStandardPrice,
        costPrice: 0,
        gstRate: rawGstRate,
        hsnCode: rawHsnCode || undefined,
        notes: rawNotes || undefined,
        isActive: true,
      });
    }
  }

  return { items, matchedCount, newCount, errors };
}
