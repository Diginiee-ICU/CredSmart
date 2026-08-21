import { Party } from "@/types/parties";
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

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (!cols || cols.length === 0 || !cols[0]) continue;

    const name = cols[0];
    const sku = cols[1] || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
    const barcode = cols[2] || null;
    const category = cols[3] || "General";
    const brand = cols[4] || null;
    const unit: any = cols[5] ? cols[5].toUpperCase() : "PCS";
    const sellingPrice = parseFloat(cols[6] || "0") || 0;
    const purchasePrice = parseFloat(cols[7] || "0") || 0;
    const mrp = parseFloat(cols[8] || "0") || sellingPrice;
    const gstRate: any = parseFloat(cols[9] || "0") || 0;
    const hsnCode = cols[10] || null;
    const openingStock = parseFloat(cols[11] || "0") || 0;
    const minStockAlert = parseFloat(cols[12] || "5") || 5;
    const batchNumber = cols[13] || "DEFAULT";
    const expiryDate = cols[14] || null;

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
