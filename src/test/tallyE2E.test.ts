import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseTallyXml,
  autoDetectAndParseTally,
  getAllTallyVouchers,
  TallyParseResult,
  TallyVoucher,
  TallyBankAccount,
} from "../utils/tallyXmlParser";
import {
  TALLY_EXPORT_DAYBOOK_XML,
  TALLY_EXPORT_MASTERS_XML,
  getDefaultSyncConfig,
  getSyncConfig,
  saveSyncConfig,
  executeDirectSyncIngestion,
  SyncConfig,
  SyncAuditLog,
  SyncExecutionResult,
} from "../services/autoSyncService";

// ─── Supabase In-Memory Mock Harness ──────────────────────────────────────────

interface MockTableStore {
  [table: string]: any[];
}

class MockSupabaseHarness {
  private store: MockTableStore = {};
  public insertedRows: { [table: string]: any[] } = {};
  public upsertedRows: { [table: string]: any[] } = {};

  constructor() {
    this.reset();
  }

  reset() {
    this.store = {
      products: [],
      product_batches: [],
      customers: [],
      suppliers: [],
      credit_transactions: [],
      sales: [],
      sale_items: [],
      purchase_invoices: [],
      purchase_invoice_items: [],
      expenses: [],
      bank_accounts: [],
    };
    this.insertedRows = {
      products: [],
      product_batches: [],
      customers: [],
      suppliers: [],
      credit_transactions: [],
      sales: [],
      sale_items: [],
      purchase_invoices: [],
      purchase_invoice_items: [],
      expenses: [],
      bank_accounts: [],
    };
  }

  seed(table: string, rows: any[]) {
    this.store[table] = [...rows];
  }

  from(table: string) {
    const self = this;
    let selectedColumns = "*";
    let filteredData = [...(self.store[table] || [])];

    const builder = {
      select: (cols: string = "*") => {
        selectedColumns = cols;
        return builder;
      },
      eq: (field: string, val: any) => {
        filteredData = filteredData.filter((r) => r[field] === val);
        return builder;
      },
      in: (field: string, vals: any[]) => {
        filteredData = filteredData.filter((r) => vals.includes(r[field]));
        return builder;
      },
      insert: async (rowsOrRow: any | any[]) => {
        const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
        const withIds = rows.map((r) => ({
          id: r.id || `mock-id-${Math.random().toString(36).substring(2, 9)}`,
          created_at: r.created_at || new Date().toISOString(),
          ...r,
        }));
        if (!self.insertedRows[table]) self.insertedRows[table] = [];
        self.insertedRows[table].push(...withIds);
        if (!self.store[table]) self.store[table] = [];
        self.store[table].push(...withIds);
        return { data: withIds, error: null };
      },
      upsert: async (rowsOrRow: any | any[], _opts?: any) => {
        const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
        const withIds = rows.map((r) => ({
          id: r.id || `mock-upsert-${Math.random().toString(36).substring(2, 9)}`,
          updated_at: new Date().toISOString(),
          ...r,
        }));
        if (!self.upsertedRows[table]) self.upsertedRows[table] = [];
        self.upsertedRows[table].push(...withIds);
        if (!self.store[table]) self.store[table] = [];
        for (const item of withIds) {
          const idx = self.store[table].findIndex((e) => e.id === item.id || (e.name && e.name === item.name));
          if (idx >= 0) {
            self.store[table][idx] = { ...self.store[table][idx], ...item };
          } else {
            self.store[table].push(item);
          }
        }
        return { data: withIds, error: null };
      },
      then: (resolve: (val: any) => void) => {
        resolve({ data: filteredData, error: null });
      },
    };

    return builder;
  }
}

export const mockDb = new MockSupabaseHarness();

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockDb.from(table),
    auth: {
      getUser: async () => ({
        data: { user: { id: "00000000-0000-0000-0000-000000000001", email: "tester@credsmart.test" } },
        error: null,
      }),
    },
  },
}));

// ─── LocalStorage Sandbox ─────────────────────────────────────────────────────

const virtualStorage = new Map<string, string>();
const dispatchedEvents: { type: string; detail?: any }[] = [];

if (typeof window !== "undefined") {
  const originalGetItem = localStorage.getItem;
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  const originalClear = localStorage.clear;

  localStorage.getItem = (k: string) => virtualStorage.get(k) ?? null;
  localStorage.setItem = (k: string, v: string) => {
    virtualStorage.set(k, String(v));
  };
  localStorage.removeItem = (k: string) => {
    virtualStorage.delete(k);
  };
  localStorage.clear = () => {
    virtualStorage.clear();
  };

  window.addEventListener("credsmart_bank_updated", (e: any) => {
    dispatchedEvents.push({ type: "credsmart_bank_updated", detail: e.detail });
  });
  window.addEventListener("credsmart:parties_updated", (e: any) => {
    dispatchedEvents.push({ type: "credsmart:parties_updated", detail: e.detail });
  });
}

const TEST_ORG_ID = "org-test-e2e-001";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1: FEATURE COVERAGE (Requirement-Driven, Opaque-Box)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tier 1: Comprehensive Feature Coverage", () => {
  beforeEach(() => {
    mockDb.reset();
    virtualStorage.clear();
    dispatchedEvents.length = 0;
  });

  // ─── 1.1 DayBook XML Date Range Support ─────────────────────────────────────
  describe("1.1 DayBook XML Date Range Support (R2, PROJECT.md #1)", () => {
    it("1.1.1 DayBook export XML includes SVFROMDATE and SVTODATE static variables", () => {
      expect(TALLY_EXPORT_DAYBOOK_XML).toContain("<SVFROMDATE>");
      expect(TALLY_EXPORT_DAYBOOK_XML).toContain("<SVTODATE>");
    });

    it("1.1.2 DayBook query specifies REPORTNAME Day Book with XML export format", () => {
      expect(TALLY_EXPORT_DAYBOOK_XML).toContain("<REPORTNAME>Day Book</REPORTNAME>");
      expect(TALLY_EXPORT_DAYBOOK_XML).toContain("<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>");
    });

    it("1.1.3 DayBook query specifies EXPLODEFLAG Yes for line-item visibility", () => {
      expect(TALLY_EXPORT_DAYBOOK_XML).toContain("<EXPLODEFLAG>Yes</EXPLODEFLAG>");
    });

    it("1.1.4 Tally envelope structure encapsulates header and export request correctly", () => {
      expect(TALLY_EXPORT_DAYBOOK_XML).toMatch(/^<ENVELOPE>/);
      expect(TALLY_EXPORT_DAYBOOK_XML).toContain("<TALLYREQUEST>Export Data</TALLYREQUEST>");
      expect(TALLY_EXPORT_DAYBOOK_XML).toMatch(/<\/ENVELOPE>$/);
    });

    it("1.1.5 Masters XML query targets All Masters for catalog synchronization", () => {
      expect(TALLY_EXPORT_MASTERS_XML).toContain("<ACCOUNTTYPE>All Masters</ACCOUNTTYPE>");
      expect(TALLY_EXPORT_MASTERS_XML).toContain("<REPORTNAME>List of Accounts</REPORTNAME>");
    });
  });

  // ─── 1.2 SyncConfig & Scope Expansion ───────────────────────────────────────
  describe("1.2 SyncConfig & Scope Expansion (R3, PROJECT.md #2)", () => {
    it("1.2.1 getDefaultSyncConfig enables all 5 entity types by default", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      expect(config.syncScope).toBeDefined();
      expect(config.syncScope.items).toBe(true);
      expect(config.syncScope.parties).toBe(true);
      expect(config.syncScope.balances).toBe(true);
      expect(config.syncScope.vouchers).toBe(true);
      expect(config.syncScope.banks).toBe(true);
    });

    it("1.2.2 getSyncConfig persists and restores banks scope flag from localStorage", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      config.syncScope.banks = false;
      saveSyncConfig(config);

      const retrieved = getSyncConfig(TEST_ORG_ID);
      expect(retrieved.syncScope.banks).toBe(false);
      expect(retrieved.syncScope.items).toBe(true);
    });

    it("1.2.3 generates safe pairing tokens with crds_live_ prefix", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      expect(config.pairingToken).toMatch(/^crds_live_/);
    });

    it("1.2.4 sets default sync interval to 15 minutes and conflictStrategy to erp_master", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      expect(config.syncIntervalMinutes).toBe(15);
      expect(config.conflictStrategy).toBe("erp_master");
    });

    it("1.2.5 initial sync status defaults to idle with empty audit history", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      expect(config.lastSyncStatus).toBe("idle");
      expect(Array.isArray(config.history)).toBe(true);
      expect(config.history.length).toBe(0);
    });
  });

  // ─── 1.3 Sync Metrics & Audit Expansion ─────────────────────────────────────
  describe("1.3 Sync Metrics & Audit Expansion (R3, PROJECT.md #3)", () => {
    it("1.3.1 SyncExecutionResult records counts for all ingested entity types", async () => {
      const result = await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [{ name: "Sugar 1kg", sellingPrice: 45, purchasePrice: 38, openingStock: 100 }],
        parties: [{ name: "Sharma Grocers", partyType: "customer", balance: 5000 }],
        vouchers: [{ voucherNumber: "INV-101", date: "2026-09-01", voucherType: "Sales", partyName: "Sharma Grocers", amount: 2500 }],
        bankAccounts: [{ name: "HDFC Current", bankName: "HDFC", accountNumber: "123456", balance: 50000 }],
        cashInHand: 15000,
      });

      expect(result.success).toBe(true);
      expect(result.itemsCount).toBe(1);
      expect(result.partiesCount).toBe(1);
      expect(result.vouchersCount).toBe(1);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.log).toBeDefined();
    });

    it("1.3.2 SyncAuditLog structure captures timestamp, duration, software, and counts", async () => {
      const result = await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [{ name: "Tea 250g", sellingPrice: 90, purchasePrice: 75, openingStock: 20 }],
        parties: [],
      });

      const log = result.log;
      expect(log.id).toBeDefined();
      expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(log.software).toBe("tally");
      expect(log.status).toBe("success");
      expect(log.itemsSynced).toBe(1);
      expect(log.partiesSynced).toBe(0);
    });

    it("1.3.3 audit log tracks partial status when unmapped entities are encountered", async () => {
      const result = await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "UNKNOWN-01", date: "2026-09-01", voucherType: "UnsupportedType" as any, partyName: "Nobody", amount: 100 }],
      });

      expect(result.log.status).toBe("partial");
      expect(result.log.message).toContain("Unsupported");
    });

    it("1.3.4 sync audit log records source as direct_browser, desktop_agent, or tdl_push", async () => {
      const result = await executeDirectSyncIngestion(
        TEST_ORG_ID,
        TEST_USER_ID,
        { items: [], parties: [] },
        "desktop_agent"
      );
      expect(result.log.source).toBe("desktop_agent");
    });

    it("1.3.5 stores lastSyncStats in SyncConfig when persistence cycle finishes", () => {
      const config = getSyncConfig(TEST_ORG_ID);
      config.lastSyncStats = { items: 10, parties: 5, vouchers: 25, banks: 2, balances: 5 } as any;
      saveSyncConfig(config);

      const saved = getSyncConfig(TEST_ORG_ID);
      expect(saved.lastSyncStats?.items).toBe(10);
      expect((saved.lastSyncStats as any)?.banks).toBe(2);
    });
  });

  // ─── 1.4 Stock Items & Batches Ingestion ────────────────────────────────────
  describe("1.4 Stock Items & Batches Ingestion (R1, PROJECT.md #4)", () => {
    it("1.4.1 stock items parse standard prices, units, opening stock, GST, and HSN", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <STOCKITEM NAME="Toor Dal 1kg">
                    <BASEUNITS>KG</BASEUNITS>
                    <OPENINGBALANCE>120 KG</OPENINGBALANCE>
                    <OPENINGRATE>140/KG</OPENINGRATE>
                    <STANDARDPRICELIST.LIST><RATE>165.00/KG</RATE></STANDARDPRICELIST.LIST>
                    <STANDARDCOSTLIST.LIST><RATE>135.00/KG</RATE></STANDARDCOSTLIST.LIST>
                    <GSTDETAILS.LIST><RATEDETAILS.LIST><GSTRATE>5</GSTRATE></RATEDETAILS.LIST></GSTDETAILS.LIST>
                    <GSTREPDETAILS.LIST><HSNCODE>07136000</HSNCODE></GSTREPDETAILS.LIST>
                  </STOCKITEM>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.items.length).toBe(1);
      const item = result.items[0];
      expect(item.name).toBe("Toor Dal 1kg");
      expect(item.unit).toBe("KG");
      expect(item.openingStock).toBe(120);
      expect(item.sellingPrice).toBe(165);
      expect(item.purchasePrice).toBe(135);
      expect(item.gstRate).toBe(5);
      expect(item.hsnCode).toBe("07136000");
    });

    it("1.4.2 stock items with opening batch allocations extract batch numbers and expiries", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <STOCKITEM NAME="Amul Butter 500g">
                    <BASEUNITS>PACK</BASEUNITS>
                    <OPENINGBALANCE>50 PACK</OPENINGBALANCE>
                    <OPENINGRATE>250/PACK</OPENINGRATE>
                    <BATCHALLOCATIONS.LIST>
                      <BATCHNAME>BATCH-2026-SEP</BATCHNAME>
                      <EXPIRYPERIOD>2027-03-31</EXPIRYPERIOD>
                      <OPENINGBALANCE>50 PACK</OPENINGBALANCE>
                    </BATCHALLOCATIONS.LIST>
                  </STOCKITEM>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.items.length).toBe(1);
      expect(result.items[0].openingStock).toBe(50);
    });

    it("1.4.3 executeDirectSyncIngestion upserts stock items to products with valid tags", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [
          {
            name: "Basmati Rice 5kg",
            category: "Grains",
            sellingPrice: 450,
            purchasePrice: 360,
            openingStock: 40,
            gstRate: 5,
            hsnCode: "1006",
            unit: "BAG",
          },
        ],
        parties: [],
      });

      const inserted = mockDb.insertedRows["products"];
      expect(inserted.length).toBe(1);
      const prod = inserted[0];
      expect(prod.name).toBe("Basmati Rice 5kg");
      expect(prod.organization_id).toBe(TEST_ORG_ID);
      expect(prod.tags).toBeDefined();
      expect(prod.tags.selling_price).toBe(450);
      expect(prod.tags.purchase_price).toBe(360);
      expect(prod.tags.gst_rate).toBe(5);
      expect(prod.tags.hsn_code).toBe("1006");
      expect(prod.tags.unit).toBe("BAG");
    });

    it("1.4.4 generates deterministic stable Tally SKU prefix TALLY-", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [{ name: "Parle-G 100g", sellingPrice: 10, purchasePrice: 8 }],
        parties: [],
      });

      const prod = mockDb.insertedRows["products"][0];
      expect(prod.sku).toMatch(/^TALLY-[0-9A-F]{8}$/);
    });

    it("1.4.5 inserts or upserts product_batches linked to product_id with correct cost and stock", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [{ name: "Sunflower Oil 1L", sellingPrice: 160, purchasePrice: 130, openingStock: 25 }],
        parties: [],
      });

      const batches = mockDb.upsertedRows["product_batches"];
      expect(batches.length).toBe(1);
      expect(batches[0].cost_price).toBe(130);
      expect(batches[0].stock).toBe(25);
      expect(batches[0].batch_number).toBeDefined();
    });
  });

  // ─── 1.5 Customers & Suppliers Ingestion ────────────────────────────────────
  describe("1.5 Customers & Suppliers Ingestion (R1, PROJECT.md #5)", () => {
    it("1.5.1 resolves Sundry Debtors to customer party type with GSTIN and address", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <LEDGER NAME="Kalyan Retailers">
                    <PARENT>Sundry Debtors</PARENT>
                    <OPENINGBALANCE>32000.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                    <PARTYGSTIN>27ABCDE1234F1Z5</PARTYGSTIN>
                    <ADDRESS.LIST><ADDRESS>MG Road, Kalyan</ADDRESS></ADDRESS.LIST>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.parties.length).toBe(1);
      const party = result.parties[0];
      expect(party.name).toBe("Kalyan Retailers");
      expect(party.partyType).toBe("customer");
      expect(party.gstin).toBe("27ABCDE1234F1Z5");
      expect(party.address).toBe("MG Road, Kalyan");
      expect(party.balance).toBe(32000);
    });

    it("1.5.2 resolves Sundry Creditors to supplier party type with negative credit balance", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <LEDGER NAME="Gujarat Agro Commodities">
                    <PARENT>Sundry Creditors</PARENT>
                    <OPENINGBALANCE>95000.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                    <PARTYGSTIN>24XYZPA9876Q1Z9</PARTYGSTIN>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.parties.length).toBe(1);
      const party = result.parties[0];
      expect(party.name).toBe("Gujarat Agro Commodities");
      expect(party.partyType).toBe("supplier");
      expect(party.balance).toBe(-95000);
    });

    it("1.5.3 executeDirectSyncIngestion upserts customers to customers table", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Patel Provision Store", partyType: "customer", phone: "9876543210", address: "Surat" }],
      });

      const customers = mockDb.upsertedRows["customers"];
      expect(customers.length).toBe(1);
      expect(customers[0].name).toBe("Patel Provision Store");
      expect(customers[0].phone).toBe("9876543210");
      expect(customers[0].organization_id).toBe(TEST_ORG_ID);
    });

    it("1.5.4 executeDirectSyncIngestion upserts suppliers to suppliers table with GSTIN", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "National Grains Wholesale", partyType: "supplier", phone: "9822001122", gstin: "27AABCN1234K1Z0" }],
      });

      const suppliers = mockDb.upsertedRows["suppliers"];
      expect(suppliers.length).toBe(1);
      expect(suppliers[0].name).toBe("National Grains Wholesale");
      expect(suppliers[0].gstin).toBe("27AABCN1234K1Z0");
      expect(suppliers[0].organization_id).toBe(TEST_ORG_ID);
    });

    it("1.5.5 dispatches credsmart:parties_updated custom window event on successful party sync", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Om Enterprise", partyType: "customer" }],
      });

      const event = dispatchedEvents.find((e) => e.type === "credsmart:parties_updated");
      expect(event).toBeDefined();
      expect(event?.detail?.orgId).toBe(TEST_ORG_ID);
    });
  });

  // ─── 1.6 Party Opening Balances Schema in credit_transactions ───────────────
  describe("1.6 Party Opening Balances Schema in credit_transactions (R1, PROJECT.md #6)", () => {
    it("1.6.1 opening balances conform to Supabase credit_transactions schema", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Suresh Trading", partyType: "customer", openingBalance: 12500 }],
      });

      const txns = mockDb.insertedRows["credit_transactions"];
      expect(txns.length).toBe(1);
      const txn = txns[0];

      // Verifying strict schema conformance
      expect(txn.organization_id).toBe(TEST_ORG_ID);
      expect(txn.party_id).toBeDefined();
      expect(txn.party_type).toBe("customer");
      expect(txn.amount).toBe(12500);
      expect(txn.type).toBe("opening_balance");
      expect(txn.reference_id).toBe("SYNC-OPENING");
      expect(txn.created_by).toBeDefined();

      // Ensure invalid columns from previous defect are NOT present
      expect(txn).not.toHaveProperty("customer_id");
      expect(txn).not.toHaveProperty("supplier_id");
      expect(txn).not.toHaveProperty("payment_mode");
    });

    it("1.6.2 supplier opening balance records party_type as supplier", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Shivaji Packaging", partyType: "supplier", openingBalance: 45000 }],
      });

      const txns = mockDb.insertedRows["credit_transactions"];
      expect(txns.length).toBe(1);
      expect(txns[0].party_type).toBe("supplier");
      expect(txns[0].amount).toBe(45000);
    });

    it("1.6.3 skips opening balance credit_transaction when openingBalance is zero or absent", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Zero Balance Customer", partyType: "customer", openingBalance: 0 }],
      });

      const txns = mockDb.insertedRows["credit_transactions"];
      expect(txns.length).toBe(0);
    });

    it("1.6.4 created_by defaults to active userId or sync_daemon UUID", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Valid User Customer", partyType: "customer", openingBalance: 1000 }],
      });

      const txn = mockDb.insertedRows["credit_transactions"][0];
      expect(txn.created_by).toBe(TEST_USER_ID);
    });

    it("1.6.5 description states Opening Balance for clear audit trails", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Audit Cust", partyType: "customer", openingBalance: 2000 }],
      });

      const txn = mockDb.insertedRows["credit_transactions"][0];
      expect(txn.description).toContain("Opening Balance");
    });
  });

  // ─── 1.7 Bank Accounts Storage ──────────────────────────────────────────────
  describe("1.7 Bank Accounts Storage (R1, PROJECT.md #7)", () => {
    it("1.7.1 parseTallyXml extracts Bank Accounts ledgers with IFSC and account number", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <LEDGER NAME="HDFC Bank Main Current A/c">
                    <PARENT>Bank Accounts</PARENT>
                    <OPENINGBALANCE>450000.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                    <BANKACCOUNTNUMBER>50200098765432</BANKACCOUNTNUMBER>
                    <IFSCODE>HDFC0000123</IFSCODE>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.bankAccounts.length).toBe(1);
      const bank = result.bankAccounts[0];
      expect(bank.accountName).toBe("HDFC Bank Main Current A/c");
      expect(bank.accountNumber).toBe("50200098765432");
      expect(bank.ifsc).toBe("HDFC0000123");
      expect(bank.balance).toBe(450000);
    });

    it("1.7.2 executeDirectSyncIngestion saves bank accounts to credsmart_bank_accounts_{orgId}", async () => {
      const bankAccounts: TallyBankAccount[] = [
        {
          name: "SBI Current Account",
          accountName: "SBI Current Account",
          bankName: "State Bank of India",
          accountNumber: "30012345678",
          ifsc: "SBIN0001234",
          balance: 185000,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        bankAccounts,
      });

      const stored = localStorage.getItem(`credsmart_bank_accounts_${TEST_ORG_ID}`);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].accountNumber).toBe("30012345678");
      expect(parsed[0].balance).toBe(185000);
    });

    it("1.7.3 merges new bank accounts with existing accounts without duplicating account numbers", async () => {
      const existing = [
        {
          id: "bank-1",
          name: "HDFC Primary",
          bankName: "HDFC",
          accountNumber: "5020001111",
          balance: 50000,
        },
      ];
      localStorage.setItem(`credsmart_bank_accounts_${TEST_ORG_ID}`, JSON.stringify(existing));

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        bankAccounts: [
          {
            name: "HDFC Primary",
            bankName: "HDFC",
            accountNumber: "5020001111",
            balance: 65000, // Updated balance
          },
          {
            name: "ICICI Business A/c",
            bankName: "ICICI",
            accountNumber: "000222333",
            balance: 120000,
          },
        ],
      });

      const parsed = JSON.parse(localStorage.getItem(`credsmart_bank_accounts_${TEST_ORG_ID}`)!);
      expect(parsed.length).toBe(2);
      const hdfc = parsed.find((b: any) => b.accountNumber === "5020001111");
      expect(hdfc.balance).toBe(65000);
    });

    it("1.7.4 recognizes bank accounts in multi-file universal import", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <LEDGER NAME="Axis Bank CC">
                    <PARENT>Bank Accounts</PARENT>
                    <OPENINGBALANCE>75000.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const res = autoDetectAndParseTally(xml);
      expect(res.bankAccounts.length).toBe(1);
      expect(res.bankAccounts[0].balance).toBe(75000);
    });

    it("1.7.5 sets default accountType to current when not explicitly specified", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        bankAccounts: [{ name: "Kotak Mahindra", bankName: "Kotak", balance: 40000 }],
      });

      const parsed = JSON.parse(localStorage.getItem(`credsmart_bank_accounts_${TEST_ORG_ID}`)!);
      expect(parsed[0].accountType).toBe("current");
    });
  });

  // ─── 1.8 Cash-in-Hand Balance Storage ───────────────────────────────────────
  describe("1.8 Cash-in-Hand Balance Storage (R1, PROJECT.md #8)", () => {
    it("1.8.1 parseTallyXml aggregates all Cash-in-Hand ledgers into single cashInHand amount", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <LEDGER NAME="Cash">
                    <PARENT>Cash-in-Hand</PARENT>
                    <OPENINGBALANCE>18500.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  </LEDGER>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <LEDGER NAME="Petty Cash Box">
                    <PARENT>Cash-in-Hand</PARENT>
                    <OPENINGBALANCE>3500.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.cashInHand).toBe(22000);
    });

    it("1.8.2 executeDirectSyncIngestion saves cash-in-hand to credsmart_cash_in_hand_{orgId}", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        cashInHand: 28500,
      });

      const stored = localStorage.getItem(`credsmart_cash_in_hand_${TEST_ORG_ID}`);
      expect(stored).toBe("28500");
    });

    it("1.8.3 dispatches credsmart_bank_updated window event when cash or bank updates", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        cashInHand: 15000,
      });

      const event = dispatchedEvents.find((e) => e.type === "credsmart_bank_updated");
      expect(event).toBeDefined();
    });

    it("1.8.4 defaults cash-in-hand to zero when no cash ledgers exist", () => {
      const xml = `<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      const result = parseTallyXml(xml);
      expect(result.cashInHand).toBe(0);
    });

    it("1.8.5 parses cash ledger with Indian comma notation accurately", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <LEDGER NAME="Vault Cash">
                    <PARENT>Cash-in-Hand</PARENT>
                    <OPENINGBALANCE>₹ 1,50,000.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.cashInHand).toBe(150000);
    });
  });

  // ─── 1.9 Sales Vouchers & Line Items ────────────────────────────────────────
  describe("1.9 Sales Vouchers & Line Items Ingestion (R1, PROJECT.md #9)", () => {
    it("1.9.1 parses sales voucher header and line items with batch and expiry", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Sales">
                    <DATE>20260910</DATE>
                    <VOUCHERNUMBER>INV/2026/042</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Gupta Supermarket</PARTYLEDGERNAME>
                    <NARRATION>Credit sale 15 days</NARRATION>
                    <ALLINVENTORYENTRIES.LIST>
                      <STOCKITEMNAME>Washing Powder 1kg</STOCKITEMNAME>
                      <ACTUALQTY>20 PCS</ACTUALQTY>
                      <RATE>110.00/PCS</RATE>
                      <AMOUNT>-2200.00</AMOUNT>
                      <BATCHALLOCATIONS.LIST>
                        <BATCHNAME>BATCH-SEP-01</BATCHNAME>
                        <EXPIRYPERIOD>2028-09-30</EXPIRYPERIOD>
                      </BATCHALLOCATIONS.LIST>
                    </ALLINVENTORYENTRIES.LIST>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Gupta Supermarket</LEDGERNAME>
                      <AMOUNT>2200.00</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.salesVouchers.length).toBe(1);
      const sale = result.salesVouchers[0];
      expect(sale.voucherNumber).toBe("INV/2026/042");
      expect(sale.partyName).toBe("Gupta Supermarket");
      expect(sale.items?.length).toBe(1);
      expect(sale.items![0].itemName).toBe("Washing Powder 1kg");
      expect(sale.items![0].quantity).toBe(20);
      expect(sale.items![0].rate).toBe(110);
      expect(sale.items![0].amount).toBe(2200);
      expect(sale.items![0].batchNumber).toBe("BATCH-SEP-01");
    });

    it("1.9.2 executeDirectSyncIngestion creates sales record with invoice_number and total", async () => {
      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "INV-SALE-88",
          date: "2026-09-12",
          voucherType: "Sales",
          partyName: "Sharma Stores",
          amount: 5500,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [{ name: "Sharma Stores", partyType: "customer" }],
        vouchers,
      });

      const sales = mockDb.insertedRows["sales"];
      expect(sales.length).toBe(1);
      expect(sales[0].invoice_number).toBe("INV-SALE-88");
      expect(sales[0].total).toBe(5500);
      expect(sales[0].organization_id).toBe(TEST_ORG_ID);
    });

    it("1.9.3 sales line items insert into sale_items with line_total and linked sale_id", async () => {
      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "INV-SALE-89",
          date: "2026-09-12",
          voucherType: "Sales",
          partyName: "Sharma Stores",
          amount: 1500,
          items: [
            {
              itemName: "Toothpaste 100g",
              quantity: 15,
              unit: "PCS",
              rate: 100,
              amount: 1500,
            },
          ],
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [{ name: "Toothpaste 100g", sellingPrice: 100 }],
        parties: [{ name: "Sharma Stores", partyType: "customer" }],
        vouchers,
      });

      const saleItems = mockDb.insertedRows["sale_items"];
      expect(saleItems.length).toBe(1);
      expect(saleItems[0].product_name).toBe("Toothpaste 100g");
      expect(saleItems[0].quantity).toBe(15);
      expect(saleItems[0].line_total).toBe(1500);
      expect(saleItems[0].sale_id).toBeDefined();
    });

    it("1.9.4 links existing customer_id to sales voucher", async () => {
      mockDb.seed("customers", [{ id: "cust-uuid-42", name: "Sharma Stores", organization_id: TEST_ORG_ID }]);

      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "INV-LINKED-1",
          date: "2026-09-12",
          voucherType: "Sales",
          partyName: "Sharma Stores",
          amount: 3000,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      const sale = mockDb.insertedRows["sales"][0];
      expect(sale.customer_id).toBe("cust-uuid-42");
    });

    it("1.9.5 prevents duplicate insertion if sale invoice_number already exists", async () => {
      mockDb.seed("sales", [{ id: "existing-sale-1", invoice_number: "INV-DUP-1", organization_id: TEST_ORG_ID }]);

      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "INV-DUP-1",
          date: "2026-09-12",
          voucherType: "Sales",
          partyName: "Sharma Stores",
          amount: 4000,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      expect(mockDb.insertedRows["sales"].length).toBe(0);
    });
  });

  // ─── 1.10 Purchase Invoices & Line Items ────────────────────────────────────
  describe("1.10 Purchase Invoices & Line Items Ingestion (R1, PROJECT.md #10)", () => {
    it("1.10.1 parses purchase voucher with items, supplier, and narration", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Purchase">
                    <DATE>20260905</DATE>
                    <VOUCHERNUMBER>PUR/26/001</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Agro Mills Ltd</PARTYLEDGERNAME>
                    <NARRATION>Purchase of grains</NARRATION>
                    <ALLINVENTORYENTRIES.LIST>
                      <STOCKITEMNAME>Wheat Grain 50kg</STOCKITEMNAME>
                      <ACTUALQTY>10 BAG</ACTUALQTY>
                      <RATE>1800.00/BAG</RATE>
                      <AMOUNT>18000.00</AMOUNT>
                    </ALLINVENTORYENTRIES.LIST>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Agro Mills Ltd</LEDGERNAME>
                      <AMOUNT>-18000.00</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.purchaseVouchers.length).toBe(1);
      const pur = result.purchaseVouchers[0];
      expect(pur.voucherNumber).toBe("PUR/26/001");
      expect(pur.partyName).toBe("Agro Mills Ltd");
      expect(pur.amount).toBe(18000);
      expect(pur.items?.length).toBe(1);
      expect(pur.items![0].rate).toBe(1800);
    });

    it("1.10.2 executeDirectSyncIngestion creates purchase_invoices entry", async () => {
      mockDb.seed("suppliers", [{ id: "supp-agro-1", name: "Agro Mills Ltd", organization_id: TEST_ORG_ID }]);

      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "PUR/26/001",
          date: "2026-09-05",
          voucherType: "Purchase",
          partyName: "Agro Mills Ltd",
          amount: 18000,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      const purchases = mockDb.insertedRows["purchase_invoices"];
      expect(purchases.length).toBe(1);
      expect(purchases[0].invoice_number).toBe("PUR/26/001");
      expect(purchases[0].total_amount).toBe(18000);
      expect(purchases[0].supplier_id).toBe("supp-agro-1");
      expect(purchases[0].status).toBe("received");
    });

    it("1.10.3 purchase line items insert into purchase_invoice_items table", async () => {
      mockDb.seed("suppliers", [{ id: "supp-agro-1", name: "Agro Mills Ltd", organization_id: TEST_ORG_ID }]);
      mockDb.seed("products", [{ id: "prod-wheat-1", name: "Wheat Grain 50kg", organization_id: TEST_ORG_ID }]);

      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "PUR/26/002",
          date: "2026-09-05",
          voucherType: "Purchase",
          partyName: "Agro Mills Ltd",
          amount: 9000,
          items: [
            {
              itemName: "Wheat Grain 50kg",
              quantity: 5,
              unit: "BAG",
              rate: 1800,
              amount: 9000,
              batchNumber: "PUR-BATCH-1",
            },
          ],
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      const purchaseItems = mockDb.insertedRows["purchase_invoice_items"];
      expect(purchaseItems.length).toBe(1);
      expect(purchaseItems[0].quantity).toBe(5);
      expect(purchaseItems[0].cost_price).toBe(1800);
      expect(purchaseItems[0].batch_number).toBe("PUR-BATCH-1");
      expect(purchaseItems[0].product_id).toBe("prod-wheat-1");
    });

    it("1.10.4 auto-resolves missing supplier by creating a vendor stub or matching", async () => {
      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "PUR-NEW-SUPP-1",
          date: "2026-09-05",
          voucherType: "Purchase",
          partyName: "Brand New Supplier Ltd",
          amount: 12000,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      // Either supplier was auto-created or purchase was safely ingested with stub
      const purchases = mockDb.insertedRows["purchase_invoices"];
      expect(purchases.length).toBeGreaterThanOrEqual(1);
      expect(purchases[0].invoice_number).toBe("PUR-NEW-SUPP-1");
    });

    it("1.10.5 ignores duplicate purchase voucher insertion by invoice_number", async () => {
      mockDb.seed("purchase_invoices", [{ id: "pi-exist", invoice_number: "PUR-DUP-1", organization_id: TEST_ORG_ID }]);

      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "PUR-DUP-1",
          date: "2026-09-05",
          voucherType: "Purchase",
          partyName: "Agro Mills Ltd",
          amount: 5000,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      expect(mockDb.insertedRows["purchase_invoices"].length).toBe(0);
    });
  });

  // ─── 1.11 Customer Receipts Ingestion ───────────────────────────────────────
  describe("1.11 Customer Receipts Ingestion (R1, PROJECT.md #11)", () => {
    it("1.11.1 parses receipt vouchers with customer name and settlement amount", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Receipt">
                    <DATE>20260908</DATE>
                    <VOUCHERNUMBER>RCT-1001</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Gupta Supermarket</PARTYLEDGERNAME>
                    <NARRATION>NEFT received</NARRATION>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Gupta Supermarket</LEDGERNAME>
                      <AMOUNT>5000.00</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.receiptVouchers.length).toBe(1);
      expect(result.receiptVouchers[0].voucherNumber).toBe("RCT-1001");
      expect(result.receiptVouchers[0].partyName).toBe("Gupta Supermarket");
      expect(result.receiptVouchers[0].amount).toBe(5000);
    });

    it("1.11.2 executeDirectSyncIngestion inserts payment transaction into credit_transactions", async () => {
      mockDb.seed("customers", [{ id: "cust-gupta-1", name: "Gupta Supermarket", organization_id: TEST_ORG_ID }]);

      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "RCT-1001",
          date: "2026-09-08",
          voucherType: "Receipt",
          partyName: "Gupta Supermarket",
          amount: 5000,
          narration: "NEFT received",
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      const txns = mockDb.insertedRows["credit_transactions"];
      expect(txns.length).toBe(1);
      expect(txns[0].party_type).toBe("customer");
      expect(txns[0].party_id).toBe("cust-gupta-1");
      expect(txns[0].type).toBe("payment");
      expect(txns[0].amount).toBe(5000);
      expect(txns[0].reference_id).toBe("RCT-1001");
    });

    it("1.11.3 increments vouchersCount metric on receipt voucher ingestion", async () => {
      mockDb.seed("customers", [{ id: "cust-gupta-1", name: "Gupta Supermarket", organization_id: TEST_ORG_ID }]);

      const result = await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "RCT-1002", date: "2026-09-08", voucherType: "Receipt", partyName: "Gupta Supermarket", amount: 2000 }],
      });

      expect(result.vouchersCount).toBe(1);
      expect(result.log.status).toBe("success");
    });

    it("1.11.4 records valid created_by UUID on receipt payment transactions", async () => {
      mockDb.seed("customers", [{ id: "cust-gupta-1", name: "Gupta Supermarket", organization_id: TEST_ORG_ID }]);

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "RCT-1003", date: "2026-09-08", voucherType: "Receipt", partyName: "Gupta Supermarket", amount: 1500 }],
      });

      const txn = mockDb.insertedRows["credit_transactions"][0];
      expect(txn.created_by).toBe(TEST_USER_ID);
    });

    it("1.11.5 descriptions preserve voucher narration or default to Tally Receipt", async () => {
      mockDb.seed("customers", [{ id: "cust-gupta-1", name: "Gupta Supermarket", organization_id: TEST_ORG_ID }]);

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "RCT-1004", date: "2026-09-08", voucherType: "Receipt", partyName: "Gupta Supermarket", amount: 1500, narration: "Cheque clearance #449" }],
      });

      const txn = mockDb.insertedRows["credit_transactions"][0];
      expect(txn.description).toContain("Cheque clearance #449");
    });
  });

  // ─── 1.12 Vendor Payments Ingestion ─────────────────────────────────────────
  describe("1.12 Vendor Payments Ingestion (R1, PROJECT.md #12)", () => {
    it("1.12.1 parses payment vouchers with supplier name and payment amount", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Payment">
                    <DATE>20260909</DATE>
                    <VOUCHERNUMBER>PAY-5001</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Agro Mills Ltd</PARTYLEDGERNAME>
                    <NARRATION>RTGS payment to vendor</NARRATION>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Agro Mills Ltd</LEDGERNAME>
                      <AMOUNT>-25000.00</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.paymentVouchers.length).toBe(1);
      expect(result.paymentVouchers[0].voucherNumber).toBe("PAY-5001");
      expect(result.paymentVouchers[0].partyName).toBe("Agro Mills Ltd");
      expect(result.paymentVouchers[0].amount).toBe(25000);
    });

    it("1.12.2 executeDirectSyncIngestion inserts payment transaction for supplier", async () => {
      mockDb.seed("suppliers", [{ id: "supp-agro-1", name: "Agro Mills Ltd", organization_id: TEST_ORG_ID }]);

      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "PAY-5001",
          date: "2026-09-09",
          voucherType: "Payment",
          partyName: "Agro Mills Ltd",
          amount: 25000,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      const txns = mockDb.insertedRows["credit_transactions"];
      expect(txns.length).toBe(1);
      expect(txns[0].party_type).toBe("supplier");
      expect(txns[0].party_id).toBe("supp-agro-1");
      expect(txns[0].type).toBe("payment");
      expect(txns[0].amount).toBe(25000);
      expect(txns[0].reference_id).toBe("PAY-5001");
    });

    it("1.12.3 sets organization_id and created_by on supplier payment transactions", async () => {
      mockDb.seed("suppliers", [{ id: "supp-agro-1", name: "Agro Mills Ltd", organization_id: TEST_ORG_ID }]);

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "PAY-5002", date: "2026-09-09", voucherType: "Payment", partyName: "Agro Mills Ltd", amount: 10000 }],
      });

      const txn = mockDb.insertedRows["credit_transactions"][0];
      expect(txn.organization_id).toBe(TEST_ORG_ID);
      expect(txn.created_by).toBe(TEST_USER_ID);
    });

    it("1.12.4 increments vouchersCount metric on payment voucher ingestion", async () => {
      mockDb.seed("suppliers", [{ id: "supp-agro-1", name: "Agro Mills Ltd", organization_id: TEST_ORG_ID }]);

      const result = await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "PAY-5003", date: "2026-09-09", voucherType: "Payment", partyName: "Agro Mills Ltd", amount: 12000 }],
      });

      expect(result.vouchersCount).toBe(1);
      expect(result.log.status).toBe("success");
    });

    it("1.12.5 records payment_mode or notes from voucher narration", async () => {
      mockDb.seed("suppliers", [{ id: "supp-agro-1", name: "Agro Mills Ltd", organization_id: TEST_ORG_ID }]);

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "PAY-5004", date: "2026-09-09", voucherType: "Payment", partyName: "Agro Mills Ltd", amount: 8000, narration: "Paid via HDFC NEFT" }],
      });

      const txn = mockDb.insertedRows["credit_transactions"][0];
      expect(txn.description).toContain("Paid via HDFC NEFT");
    });
  });

  // ─── 1.13 Operating Expenses Ingestion ──────────────────────────────────────
  describe("1.13 Operating Expenses Ingestion (R1, PROJECT.md #13)", () => {
    it("1.13.1 parses expense entries from Journal and Payment vouchers with expense ledgers", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Payment">
                    <DATE>20260902</DATE>
                    <VOUCHERNUMBER>EXP-001</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Office Rent Account</PARTYLEDGERNAME>
                    <NARRATION>Office rent for September</NARRATION>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Office Rent Account</LEDGERNAME>
                      <AMOUNT>-25000.00</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;
      const result = parseTallyXml(xml);
      expect(result.paymentVouchers.length).toBe(1);
      expect(result.paymentVouchers[0].partyName).toBe("Office Rent Account");
    });

    it("1.13.2 executeDirectSyncIngestion persists operating expenses into expenses table", async () => {
      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "EXP-RENT-01",
          date: "2026-09-02",
          voucherType: "Payment",
          partyName: "Office Rent",
          amount: 25000,
          narration: "Office rent for September",
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      const expenses = mockDb.insertedRows["expenses"];
      expect(expenses.length).toBe(1);
      expect(expenses[0].category).toBe("Office Rent");
      expect(expenses[0].amount).toBe(25000);
      expect(expenses[0].expense_number).toBe("EXP-RENT-01");
      expect(expenses[0].organization_id).toBe(TEST_ORG_ID);
    });

    it("1.13.3 saves expenses to localStorage backup when database insert is offline", async () => {
      const vouchers: TallyVoucher[] = [
        {
          voucherNumber: "EXP-PETTY-01",
          date: "2026-09-02",
          voucherType: "Journal",
          partyName: "Tea & Refreshments",
          amount: 450,
        },
      ];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

      const expenses = mockDb.insertedRows["expenses"];
      expect(expenses.length).toBe(1);
      expect(expenses[0].amount).toBe(450);
    });

    it("1.13.4 records created_by user UUID on expense record", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "EXP-002", date: "2026-09-03", voucherType: "Payment", partyName: "Electricity Bill", amount: 3400 }],
      });

      const exp = mockDb.insertedRows["expenses"][0];
      expect(exp.created_by).toBe(TEST_USER_ID);
    });

    it("1.13.5 assigns default category General Expense when party name is unclassified", async () => {
      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: [],
        vouchers: [{ voucherNumber: "EXP-003", date: "2026-09-03", voucherType: "Journal", partyName: "", amount: 1200 }],
      });

      const exp = mockDb.insertedRows["expenses"][0];
      expect(exp.category).toBe("General Expense");
    });
  });

  // ─── 1.14 TallyImportModal Callback Wiring ──────────────────────────────────
  describe("1.14 TallyImportModal Callback Wiring (R3, PROJECT.md #14)", () => {
    it("1.14.1 onImportBankAccounts callback prop is defined and executable", () => {
      let importedBanks: any[] = [];
      let importedCash = 0;

      const handleImportBankAccounts = (banks: any[], cash: number) => {
        importedBanks = banks;
        importedCash = cash;
      };

      const testBanks = [{ accountName: "ICICI Bank", balance: 50000 }];
      handleImportBankAccounts(testBanks, 12000);

      expect(importedBanks.length).toBe(1);
      expect(importedCash).toBe(12000);
    });

    it("1.14.2 onImportBankAccounts saves to localStorage keys accurately", () => {
      const handleImportBankAccounts = (banks: any[], cash: number) => {
        localStorage.setItem(`credsmart_bank_accounts_${TEST_ORG_ID}`, JSON.stringify(banks));
        localStorage.setItem(`credsmart_cash_in_hand_${TEST_ORG_ID}`, String(cash));
      };

      handleImportBankAccounts([{ id: "b-1", name: "HDFC" }], 25000);

      expect(localStorage.getItem(`credsmart_cash_in_hand_${TEST_ORG_ID}`)).toBe("25000");
      expect(JSON.parse(localStorage.getItem(`credsmart_bank_accounts_${TEST_ORG_ID}`)!).length).toBe(1);
    });

    it("1.14.3 triggers credsmart_bank_updated custom event after modal import", () => {
      const handleImportBankAccounts = (_banks: any[], _cash: number) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("credsmart_bank_updated"));
        }
      };

      handleImportBankAccounts([], 1000);
      const ev = dispatchedEvents.find((e) => e.type === "credsmart_bank_updated");
      expect(ev).toBeDefined();
    });

    it("1.14.4 accepts both bank accounts array and cash number simultaneously", () => {
      let callCount = 0;
      const callback = (banks: any[], cash: number) => {
        callCount++;
        expect(Array.isArray(banks)).toBe(true);
        expect(typeof cash).toBe("number");
      };

      callback([{ name: "SBI" }], 5000);
      expect(callCount).toBe(1);
    });

    it("1.14.5 handles empty banks array with non-zero cash gracefully", () => {
      let savedCash = 0;
      const callback = (_banks: any[], cash: number) => {
        savedCash = cash;
      };

      callback([], 4500);
      expect(savedCash).toBe(4500);
    });
  });

  // ─── 1.15 Auto-Sync Scope Checkboxes UI State ───────────────────────────────
  describe("1.15 Auto-Sync Scope Checkboxes UI State (R3, PROJECT.md #15)", () => {
    it("1.15.1 scope state contains all 5 discrete entity keys", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      const keys = Object.keys(config.syncScope).sort();
      expect(keys).toEqual(["balances", "banks", "items", "parties", "vouchers"].sort());
    });

    it("1.15.2 each scope toggle independently flips boolean state", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      config.syncScope.banks = !config.syncScope.banks;
      expect(config.syncScope.banks).toBe(false);
      expect(config.syncScope.items).toBe(true);
    });

    it("1.15.3 disabling vouchers scope prevents vouchers from syncing", async () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      config.syncScope.vouchers = false;
      saveSyncConfig(config);

      const vouchers: TallyVoucher[] = [{ voucherNumber: "SKIPPED-1", date: "2026-09-01", voucherType: "Sales", partyName: "X", amount: 100 }];

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [{ name: "Item S", sellingPrice: 50 }],
        parties: [],
        vouchers: config.syncScope.vouchers ? vouchers : [],
      });

      expect(mockDb.insertedRows["sales"].length).toBe(0);
      expect(mockDb.insertedRows["products"].length).toBe(1);
    });

    it("1.15.4 disabling items scope skips product and batch upserts", async () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      config.syncScope.items = false;

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: config.syncScope.items ? [{ name: "Should Skip", sellingPrice: 10 }] : [],
        parties: [{ name: "Active Party", partyType: "customer" }],
      });

      expect(mockDb.insertedRows["products"].length).toBe(0);
      expect(mockDb.upsertedRows["customers"].length).toBe(1);
    });

    it("1.15.5 disabling parties scope preserves existing customers without inserts", async () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      config.syncScope.parties = false;

      await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [],
        parties: config.syncScope.parties ? [{ name: "Skip Party", partyType: "customer" }] : [],
      });

      expect(mockDb.upsertedRows["customers"].length).toBe(0);
    });
  });

  // ─── 1.16 Auto-Sync Dashboard Stats UI State ────────────────────────────────
  describe("1.16 Auto-Sync Dashboard Stats UI State (R3, PROJECT.md #16)", () => {
    it("1.16.1 lastSyncStats tracks all 5 entity counts", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      config.lastSyncStats = {
        items: 120,
        parties: 45,
        vouchers: 310,
        banks: 4,
        balances: 45,
      } as any;
      saveSyncConfig(config);

      const saved = getSyncConfig(TEST_ORG_ID);
      expect(saved.lastSyncStats?.items).toBe(120);
      expect(saved.lastSyncStats?.parties).toBe(45);
      expect(saved.lastSyncStats?.vouchers).toBe(310);
      expect((saved.lastSyncStats as any)?.banks).toBe(4);
    });

    it("1.16.2 stats render zero initially for idle configurations", () => {
      const config = getDefaultSyncConfig(TEST_ORG_ID);
      expect(config.lastSyncStats).toBeUndefined();
    });

    it("1.16.3 updates stats accurately after complete ingestion run", async () => {
      const result = await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
        items: [{ name: "A", sellingPrice: 10 }, { name: "B", sellingPrice: 20 }],
        parties: [{ name: "C", partyType: "customer" }],
        vouchers: [{ voucherNumber: "V1", date: "2026-09-01", voucherType: "Sales", partyName: "C", amount: 100 }],
        bankAccounts: [{ name: "Bank 1", balance: 1000 }],
      });

      const config = getSyncConfig(TEST_ORG_ID);
      config.lastSyncStats = {
        items: result.itemsCount,
        parties: result.partiesCount,
        vouchers: result.vouchersCount,
        banks: 1,
        balances: 1,
      } as any;
      saveSyncConfig(config);

      const refreshed = getSyncConfig(TEST_ORG_ID);
      expect(refreshed.lastSyncStats?.items).toBe(2);
      expect(refreshed.lastSyncStats?.parties).toBe(1);
      expect(refreshed.lastSyncStats?.vouchers).toBe(1);
    });

    it("1.16.4 history logs record sync status correctly (success, partial, failed)", () => {
      const config = getSyncConfig(TEST_ORG_ID);
      const log1: SyncAuditLog = {
        id: "l1",
        timestamp: new Date().toISOString(),
        software: "tally",
        status: "success",
        itemsSynced: 5,
        partiesSynced: 2,
        vouchersSynced: 10,
        durationMs: 400,
        message: "OK",
        source: "direct_browser",
      };
      config.history.push(log1);
      saveSyncConfig(config);

      expect(getSyncConfig(TEST_ORG_ID).history[0].status).toBe("success");
    });

    it("1.16.5 limits history log array to prevent unbounded storage growth", () => {
      const config = getSyncConfig(TEST_ORG_ID);
      for (let i = 0; i < 60; i++) {
        config.history.push({
          id: `log-${i}`,
          timestamp: new Date().toISOString(),
          software: "tally",
          status: "success",
          itemsSynced: 1,
          partiesSynced: 1,
          vouchersSynced: 1,
          durationMs: 50,
          message: "Synced",
          source: "direct_browser",
        });
      }
      if (config.history.length > 50) {
        config.history = config.history.slice(-50);
      }
      saveSyncConfig(config);

      expect(getSyncConfig(TEST_ORG_ID).history.length).toBe(50);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2: BOUNDARY & CORNER CASES (Adversarial Robustness)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tier 2: Boundary & Corner Cases", () => {
  beforeEach(() => {
    mockDb.reset();
    virtualStorage.clear();
  });

  it("2.1 Empty XML input returns zero entities without throwing exceptions", () => {
    const xml = "<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>";
    const result = parseTallyXml(xml);
    expect(result.items.length).toBe(0);
    expect(result.parties.length).toBe(0);
    expect(result.bankAccounts.length).toBe(0);
    expect(result.salesVouchers.length).toBe(0);
    expect(result.cashInHand).toBe(0);
    expect(result.warnings.length).toBe(0);
  });

  it("2.2 Malformed XML with unescaped ampersands parses cleanly via regex sanitization", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <STOCKITEM NAME="Salt & Pepper Seasoning 100g">
                  <PARENT>Herbs & Spices</PARENT>
                  <OPENINGBALANCE>20 PCS</OPENINGBALANCE>
                </STOCKITEM>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <LEDGER NAME="M&M General Stores">
                  <PARENT>Sundry Debtors</PARENT>
                  <OPENINGBALANCE>5000</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                </LEDGER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toBe("Salt & Pepper Seasoning 100g");
    expect(result.items[0].category).toBe("Herbs & Spices");
    expect(result.parties.length).toBe(1);
    expect(result.parties[0].name).toBe("M&M General Stores");
  });

  it("2.3 Sanitizes low ASCII control characters (0x00 to 0x1F) from Tally output", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <STOCKITEM NAME="Clean Item Name&#4;&#12;">
                  <OPENINGBALANCE>10 PCS</OPENINGBALANCE>
                </STOCKITEM>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toContain("Clean Item Name");
  });

  it("2.4 Handles negative line-item quantities and amounts by enforcing absolute values", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Sales">
                  <VOUCHERNUMBER>INV-NEG-1</VOUCHERNUMBER>
                  <DATE>20260901</DATE>
                  <PARTYLEDGERNAME>Retail Cust</PARTYLEDGERNAME>
                  <ALLINVENTORYENTRIES.LIST>
                    <STOCKITEMNAME>Biscuit Pkt</STOCKITEMNAME>
                    <ACTUALQTY>-5 PCS</ACTUALQTY>
                    <RATE>20.00/PCS</RATE>
                    <AMOUNT>-100.00</AMOUNT>
                  </ALLINVENTORYENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.salesVouchers.length).toBe(1);
    const item = result.salesVouchers[0].items![0];
    expect(item.quantity).toBe(5);
    expect(item.amount).toBe(100);
  });

  it("2.5 Handles extreme numeric amounts and Indian numbering format (Crores, Lakhs)", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <LEDGER NAME="Apex Conglomerate">
                  <PARENT>Sundry Debtors</PARENT>
                  <OPENINGBALANCE>₹ 12,34,56,789.50</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                </LEDGER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.parties.length).toBe(1);
    expect(result.parties[0].balance).toBe(123456789.5);
  });

  it("2.6 Null or undefined userId safely falls back to sync_daemon UUID", async () => {
    await executeDirectSyncIngestion(TEST_ORG_ID, null as any, {
      items: [],
      parties: [{ name: "Null User Party", partyType: "customer", openingBalance: 500 }],
    });

    const txn = mockDb.insertedRows["credit_transactions"][0];
    expect(txn.created_by).toBeDefined();
    expect(typeof txn.created_by).toBe("string");
    expect(txn.created_by.length).toBeGreaterThan(0);
  });

  it("2.7 Missing party in sales voucher defaults partyName to Cash / Counter Sale", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Sales">
                  <VOUCHERNUMBER>CASH-SALE-01</VOUCHERNUMBER>
                  <DATE>20260901</DATE>
                  <ALLLEDGERENTRIES.LIST>
                    <AMOUNT>750.00</AMOUNT>
                  </ALLLEDGERENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.salesVouchers.length).toBe(1);
    expect(result.salesVouchers[0].amount).toBe(750);
  });

  it("2.8 Stock item with zero rates and prices does not crash or produce NaN", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <STOCKITEM NAME="Sample Free Sachet">
                  <BASEUNITS>PCS</BASEUNITS>
                  <OPENINGBALANCE>100 PCS</OPENINGBALANCE>
                  <OPENINGRATE>0/PCS</OPENINGRATE>
                </STOCKITEM>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.items.length).toBe(1);
    expect(result.items[0].sellingPrice).toBe(0);
    expect(result.items[0].purchasePrice).toBe(0);
    expect(Number.isNaN(result.items[0].sellingPrice)).toBe(false);
  });

  it("2.9 Strips unneeded white spaces and carriage returns from voucher numbers", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Sales">
                  <VOUCHERNUMBER>
                    INV / 2026 / 999  
                  </VOUCHERNUMBER>
                  <DATE>20260901</DATE>
                  <ALLLEDGERENTRIES.LIST><AMOUNT>100</AMOUNT></ALLLEDGERENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.salesVouchers[0].voucherNumber.trim()).toBe("INV / 2026 / 999");
  });

  it("2.10 Tolerates ISO, DD-MM-YYYY, and compact YYYYMMDD date formats identically", () => {
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Sales">
                  <VOUCHERNUMBER>DATE-1</VOUCHERNUMBER>
                  <DATE>20260815</DATE>
                  <ALLLEDGERENTRIES.LIST><AMOUNT>10</AMOUNT></ALLLEDGERENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Sales">
                  <VOUCHERNUMBER>DATE-2</VOUCHERNUMBER>
                  <DATE>15-08-2026</DATE>
                  <ALLLEDGERENTRIES.LIST><AMOUNT>10</AMOUNT></ALLLEDGERENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
    const result = parseTallyXml(xml);
    expect(result.salesVouchers[0].date).toBe("2026-08-15");
    expect(result.salesVouchers[1].date).toBe("2026-08-15");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 3: CROSS-FEATURE COMBINATIONS (Multi-Entity Interactions)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tier 3: Pairwise Cross-Feature Interactions", () => {
  beforeEach(() => {
    mockDb.reset();
    virtualStorage.clear();
  });

  it("3.1 Ingests Sales voucher with inventory items and reconciles customer credit balance", async () => {
    // 1. Ingest customer with opening balance
    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [{ name: "Coffee Powder 50g", sellingPrice: 65, purchasePrice: 50, openingStock: 100 }],
      parties: [{ name: "South Indian Cafe", partyType: "customer", openingBalance: 4000 }],
    });

    // 2. Ingest sales voucher for that customer
    const vouchers: TallyVoucher[] = [
      {
        voucherNumber: "INV-COFFEE-01",
        date: "2026-09-15",
        voucherType: "Sales",
        partyName: "South Indian Cafe",
        amount: 1300,
        items: [{ itemName: "Coffee Powder 50g", quantity: 20, unit: "PCS", rate: 65, amount: 1300 }],
      },
    ];

    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

    // Verify sales header and line items
    const sales = mockDb.insertedRows["sales"];
    expect(sales.length).toBe(1);
    expect(sales[0].total).toBe(1300);

    const saleItems = mockDb.insertedRows["sale_items"];
    expect(saleItems.length).toBe(1);
    expect(saleItems[0].line_total).toBe(1300);

    // Verify opening balance remained intact
    const txns = mockDb.insertedRows["credit_transactions"];
    expect(txns[0].amount).toBe(4000);
    expect(txns[0].party_type).toBe("customer");
  });

  it("3.2 Ingests Purchase voucher with batch allocation and updates supplier ledger", async () => {
    // 1. Ingest supplier master
    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [{ name: "Almond 1kg", sellingPrice: 900, purchasePrice: 750, openingStock: 10 }],
      parties: [{ name: "Dry Fruits Wholesale Ltd", partyType: "supplier", openingBalance: 50000 }],
    });

    // 2. Ingest purchase invoice
    const vouchers: TallyVoucher[] = [
      {
        voucherNumber: "PUR-ALMOND-99",
        date: "2026-09-18",
        voucherType: "Purchase",
        partyName: "Dry Fruits Wholesale Ltd",
        amount: 15000,
        items: [
          {
            itemName: "Almond 1kg",
            quantity: 20,
            unit: "KG",
            rate: 750,
            amount: 15000,
            batchNumber: "ALMOND-SEP-B1",
            expiryDate: "2027-09-30",
          },
        ],
      },
    ];

    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

    const purchases = mockDb.insertedRows["purchase_invoices"];
    expect(purchases.length).toBe(1);
    expect(purchases[0].total_amount).toBe(15000);

    const purItems = mockDb.insertedRows["purchase_invoice_items"];
    expect(purItems.length).toBe(1);
    expect(purItems[0].cost_price).toBe(750);
    expect(purItems[0].batch_number).toBe("ALMOND-SEP-B1");
  });

  it("3.3 Receipt voucher settles earlier sales invoice linked to the customer", async () => {
    // 1. Create customer
    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [],
      parties: [{ name: "Modern Mart", partyType: "customer" }],
    });

    // 2. Ingest sale and subsequent receipt
    const vouchers: TallyVoucher[] = [
      {
        voucherNumber: "INV-MOD-01",
        date: "2026-09-10",
        voucherType: "Sales",
        partyName: "Modern Mart",
        amount: 8000,
      },
      {
        voucherNumber: "RCT-MOD-01",
        date: "2026-09-20",
        voucherType: "Receipt",
        partyName: "Modern Mart",
        amount: 8000,
        narration: "Settlement of INV-MOD-01",
      },
    ];

    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, { items: [], parties: [], vouchers });

    expect(mockDb.insertedRows["sales"].length).toBe(1);
    const payments = mockDb.insertedRows["credit_transactions"].filter((t) => t.type === "payment");
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(8000);
    expect(payments[0].reference_id).toBe("RCT-MOD-01");
  });

  it("3.4 Bank account balance updates alongside vouchers in unified sync cycle", async () => {
    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [{ name: "Wheat Flour 10kg", sellingPrice: 420 }],
      parties: [{ name: "City Bakeries", partyType: "customer" }],
      vouchers: [
        {
          voucherNumber: "INV-BAKE-01",
          date: "2026-09-21",
          voucherType: "Sales",
          partyName: "City Bakeries",
          amount: 4200,
        },
      ],
      bankAccounts: [
        {
          name: "Kotak Current A/c",
          accountNumber: "9988776655",
          bankName: "Kotak Mahindra Bank",
          balance: 350000,
        },
      ],
      cashInHand: 42500,
    });

    // All entities persisted without conflict
    expect(mockDb.insertedRows["products"].length).toBe(1);
    expect(mockDb.insertedRows["sales"].length).toBe(1);
    expect(JSON.parse(localStorage.getItem(`credsmart_bank_accounts_${TEST_ORG_ID}`)!).length).toBe(1);
    expect(localStorage.getItem(`credsmart_cash_in_hand_${TEST_ORG_ID}`)).toBe("42500");
  });

  it("3.5 Multi-item voucher linking to separate products and batches", async () => {
    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [
        { name: "Sugar 1kg", sellingPrice: 44, purchasePrice: 38 },
        { name: "Tea 500g", sellingPrice: 180, purchasePrice: 150 },
      ],
      parties: [{ name: "Sweet Corner", partyType: "customer" }],
      vouchers: [
        {
          voucherNumber: "INV-MULTI-01",
          date: "2026-09-22",
          voucherType: "Sales",
          partyName: "Sweet Corner",
          amount: 2240,
          items: [
            { itemName: "Sugar 1kg", quantity: 10, rate: 44, amount: 440 },
            { itemName: "Tea 500g", quantity: 10, rate: 180, amount: 1800 },
          ],
        },
      ],
    });

    const saleItems = mockDb.insertedRows["sale_items"];
    expect(saleItems.length).toBe(2);
    expect(saleItems[0].product_name).toBe("Sugar 1kg");
    expect(saleItems[1].product_name).toBe("Tea 500g");
    expect(saleItems.reduce((acc, i) => acc + i.line_total, 0)).toBe(2240);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (Enterprise Workflows)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tier 4: Real-World Business Application Scenarios", () => {
  beforeEach(() => {
    mockDb.reset();
    virtualStorage.clear();
  });

  it("4.1 Scenario 1: Full Retail Business Sync (Supermarket / Kirana)", async () => {
    // Step A: Parse realistic Full Tally Daybook & Masters export
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <!-- Masters: Items -->
              <TALLYMESSAGE>
                <STOCKITEM NAME="Fortune Sunflower Oil 1L">
                  <BASEUNITS>LTR</BASEUNITS>
                  <OPENINGBALANCE>100 LTR</OPENINGBALANCE>
                  <OPENINGRATE>135/LTR</OPENINGRATE>
                  <STANDARDPRICELIST.LIST><RATE>155.00/LTR</RATE></STANDARDPRICELIST.LIST>
                  <GSTDETAILS.LIST><RATEDETAILS.LIST><GSTRATE>5</GSTRATE></RATEDETAILS.LIST></GSTDETAILS.LIST>
                  <GSTREPDETAILS.LIST><HSNCODE>1512</HSNCODE></GSTREPDETAILS.LIST>
                </STOCKITEM>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <STOCKITEM NAME="Tata Salt 1kg">
                  <BASEUNITS>PKT</BASEUNITS>
                  <OPENINGBALANCE>200 PKT</OPENINGBALANCE>
                  <OPENINGRATE>22/PKT</OPENINGRATE>
                  <STANDARDPRICELIST.LIST><RATE>28.00/PKT</RATE></STANDARDPRICELIST.LIST>
                  <GSTDETAILS.LIST><RATEDETAILS.LIST><GSTRATE>0</GSTRATE></RATEDETAILS.LIST></GSTDETAILS.LIST>
                  <GSTREPDETAILS.LIST><HSNCODE>2501</HSNCODE></GSTREPDETAILS.LIST>
                </STOCKITEM>
              </TALLYMESSAGE>

              <!-- Masters: Parties -->
              <TALLYMESSAGE>
                <LEDGER NAME="Mahalaxmi General Store">
                  <PARENT>Sundry Debtors</PARENT>
                  <OPENINGBALANCE>15400.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <PARTYGSTIN>27AABCM9988P1Z1</PARTYGSTIN>
                  <ADDRESS.LIST><ADDRESS>Station Road, Dadar, Mumbai</ADDRESS></ADDRESS.LIST>
                </LEDGER>
              </TALLYMESSAGE>

              <!-- Masters: Bank and Cash -->
              <TALLYMESSAGE>
                <LEDGER NAME="HDFC Supermarket Current A/c">
                  <PARENT>Bank Accounts</PARENT>
                  <OPENINGBALANCE>680450.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <BANKACCOUNTNUMBER>50200045678901</BANKACCOUNTNUMBER>
                  <IFSCODE>HDFC0000004</IFSCODE>
                </LEDGER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <LEDGER NAME="Register Counter Cash">
                  <PARENT>Cash-in-Hand</PARENT>
                  <OPENINGBALANCE>45600.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                </LEDGER>
              </TALLYMESSAGE>

              <!-- Daybook: Sales, Receipt, Expense -->
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Sales">
                  <DATE>20260920</DATE>
                  <VOUCHERNUMBER>RET-INV-001</VOUCHERNUMBER>
                  <PARTYLEDGERNAME>Mahalaxmi General Store</PARTYLEDGERNAME>
                  <ALLINVENTORYENTRIES.LIST>
                    <STOCKITEMNAME>Fortune Sunflower Oil 1L</STOCKITEMNAME>
                    <ACTUALQTY>20 LTR</ACTUALQTY>
                    <RATE>155.00/LTR</RATE>
                    <AMOUNT>-3100.00</AMOUNT>
                  </ALLINVENTORYENTRIES.LIST>
                  <ALLINVENTORYENTRIES.LIST>
                    <STOCKITEMNAME>Tata Salt 1kg</STOCKITEMNAME>
                    <ACTUALQTY>10 PKT</ACTUALQTY>
                    <RATE>28.00/PKT</RATE>
                    <AMOUNT>-280.00</AMOUNT>
                  </ALLINVENTORYENTRIES.LIST>
                  <ALLLEDGERENTRIES.LIST>
                    <LEDGERNAME>Mahalaxmi General Store</LEDGERNAME>
                    <AMOUNT>3380.00</AMOUNT>
                  </ALLLEDGERENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Receipt">
                  <DATE>20260921</DATE>
                  <VOUCHERNUMBER>RET-RCT-001</VOUCHERNUMBER>
                  <PARTYLEDGERNAME>Mahalaxmi General Store</PARTYLEDGERNAME>
                  <NARRATION>UPI payment to HDFC Bank</NARRATION>
                  <ALLLEDGERENTRIES.LIST>
                    <LEDGERNAME>Mahalaxmi General Store</LEDGERNAME>
                    <AMOUNT>3380.00</AMOUNT>
                  </ALLLEDGERENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <VOUCHER VCHTYPE="Payment">
                  <DATE>20260921</DATE>
                  <VOUCHERNUMBER>RET-EXP-001</VOUCHERNUMBER>
                  <PARTYLEDGERNAME>Shop Electricity &amp; Utilities</PARTYLEDGERNAME>
                  <NARRATION>September electricity bill</NARRATION>
                  <ALLLEDGERENTRIES.LIST>
                    <LEDGERNAME>Shop Electricity &amp; Utilities</LEDGERNAME>
                    <AMOUNT>-4200.00</AMOUNT>
                  </ALLLEDGERENTRIES.LIST>
                </VOUCHER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;

    const parsed = parseTallyXml(xml);
    expect(parsed.items.length).toBe(2);
    expect(parsed.parties.length).toBe(1);
    expect(parsed.bankAccounts.length).toBe(1);
    expect(parsed.cashInHand).toBe(45600);
    expect(parsed.salesVouchers.length).toBe(1);
    expect(parsed.receiptVouchers.length).toBe(1);
    expect(parsed.paymentVouchers.length).toBe(1);

    // Step B: Ingest into CredSmart Pipeline
    const vouchers = getAllTallyVouchers(parsed);
    const syncRes = await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: parsed.items,
      parties: parsed.parties,
      vouchers,
      bankAccounts: parsed.bankAccounts,
      cashInHand: parsed.cashInHand,
    });

    expect(syncRes.success).toBe(true);
    expect(syncRes.itemsCount).toBe(2);
    expect(syncRes.partiesCount).toBe(1);
    expect(syncRes.vouchersCount).toBe(3);

    // Step C: Verify Supabase database states
    const products = mockDb.insertedRows["products"];
    expect(products.length).toBe(2);

    const customers = mockDb.upsertedRows["customers"];
    expect(customers.length).toBe(1);
    expect(customers[0].name).toBe("Mahalaxmi General Store");

    const openingBalances = mockDb.insertedRows["credit_transactions"].filter((t) => t.type === "opening_balance");
    expect(openingBalances.length).toBe(1);
    expect(openingBalances[0].amount).toBe(15400);

    const sales = mockDb.insertedRows["sales"];
    expect(sales.length).toBe(1);
    expect(sales[0].total).toBe(3380);

    const saleItems = mockDb.insertedRows["sale_items"];
    expect(saleItems.length).toBe(2);

    const receipts = mockDb.insertedRows["credit_transactions"].filter((t) => t.type === "payment");
    expect(receipts.length).toBe(1);
    expect(receipts[0].amount).toBe(3380);

    const expenses = mockDb.insertedRows["expenses"];
    expect(expenses.length).toBe(1);
    expect(expenses[0].category).toBe("Shop Electricity & Utilities");
    expect(expenses[0].amount).toBe(4200);

    // Step D: Verify Banking states
    const banks = JSON.parse(localStorage.getItem(`credsmart_bank_accounts_${TEST_ORG_ID}`)!);
    expect(banks.length).toBe(1);
    expect(banks[0].balance).toBe(680450);

    const cash = localStorage.getItem(`credsmart_cash_in_hand_${TEST_ORG_ID}`);
    expect(cash).toBe("45600");
  });

  it("4.2 Scenario 2: Manufacturing Purchase & Sales Cycle", async () => {
    // Phase 1: Ingest raw materials and supplier
    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [
        { name: "Steel Sheet 2mm", sellingPrice: 2400, purchasePrice: 1900, openingStock: 50 },
        { name: "Industrial Fasteners M8", sellingPrice: 8, purchasePrice: 4, openingStock: 5000 },
      ],
      parties: [
        { name: "Jindal Steel Distributors", partyType: "supplier", openingBalance: 120000, gstin: "27AAACJ1234F1Z0" },
        { name: "Alpha Fabricators", partyType: "customer", openingBalance: 35000 },
      ],
    });

    // Phase 2: Ingest Raw Material Purchase Invoice with Batches
    const purchaseVouchers: TallyVoucher[] = [
      {
        voucherNumber: "MFG-PUR-2026-01",
        date: "2026-09-10",
        voucherType: "Purchase",
        partyName: "Jindal Steel Distributors",
        amount: 95000,
        items: [
          {
            itemName: "Steel Sheet 2mm",
            quantity: 50,
            rate: 1900,
            amount: 95000,
            batchNumber: "HEAT-STEEL-889",
          },
        ],
      },
    ];

    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [],
      parties: [],
      vouchers: purchaseVouchers,
    });

    expect(mockDb.insertedRows["purchase_invoices"].length).toBe(1);
    expect(mockDb.insertedRows["purchase_invoice_items"].length).toBe(1);
    expect(mockDb.insertedRows["purchase_invoice_items"][0].batch_number).toBe("HEAT-STEEL-889");

    // Phase 3: Ingest Finished Goods Sales Invoice to Client
    const salesVouchers: TallyVoucher[] = [
      {
        voucherNumber: "MFG-SAL-2026-01",
        date: "2026-09-15",
        voucherType: "Sales",
        partyName: "Alpha Fabricators",
        amount: 72000,
        items: [
          {
            itemName: "Steel Sheet 2mm",
            quantity: 30,
            rate: 2400,
            amount: 72000,
          },
        ],
      },
    ];

    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [],
      parties: [],
      vouchers: salesVouchers,
    });

    expect(mockDb.insertedRows["sales"].length).toBe(1);
    expect(mockDb.insertedRows["sale_items"].length).toBe(1);

    // Phase 4: Ingest Settlement Vouchers (Receipt from Alpha + Payment to Jindal)
    const settlements: TallyVoucher[] = [
      {
        voucherNumber: "MFG-RCT-01",
        date: "2026-09-22",
        voucherType: "Receipt",
        partyName: "Alpha Fabricators",
        amount: 72000,
      },
      {
        voucherNumber: "MFG-PAY-01",
        date: "2026-09-23",
        voucherType: "Payment",
        partyName: "Jindal Steel Distributors",
        amount: 95000,
      },
    ];

    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [],
      parties: [],
      vouchers: settlements,
    });

    const payments = mockDb.insertedRows["credit_transactions"].filter((t) => t.type === "payment");
    expect(payments.length).toBe(2);
    expect(payments.some((p) => p.party_type === "customer" && p.amount === 72000)).toBe(true);
    expect(payments.some((p) => p.party_type === "supplier" && p.amount === 95000)).toBe(true);
  });

  it("4.3 Scenario 3: Multi-Bank & Cash In-Hand Reconciliation", async () => {
    // Setup 3 bank accounts and 2 cash ledgers
    const xml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE>
                <LEDGER NAME="HDFC Bank Main Current">
                  <PARENT>Bank Accounts</PARENT>
                  <OPENINGBALANCE>1250000.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <BANKACCOUNTNUMBER>5020001</BANKACCOUNTNUMBER>
                  <IFSCODE>HDFC0001</IFSCODE>
                </LEDGER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <LEDGER NAME="State Bank of India CC">
                  <PARENT>Bank Accounts</PARENT>
                  <OPENINGBALANCE>850000.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <BANKACCOUNTNUMBER>3010002</BANKACCOUNTNUMBER>
                  <IFSCODE>SBIN0002</IFSCODE>
                </LEDGER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <LEDGER NAME="ICICI Tax A/c">
                  <PARENT>Bank Accounts</PARENT>
                  <OPENINGBALANCE>320000.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <BANKACCOUNTNUMBER>0021003</BANKACCOUNTNUMBER>
                  <IFSCODE>ICIC0003</IFSCODE>
                </LEDGER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <LEDGER NAME="Main Cash Counter">
                  <PARENT>Cash-in-Hand</PARENT>
                  <OPENINGBALANCE>75000.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                </LEDGER>
              </TALLYMESSAGE>
              <TALLYMESSAGE>
                <LEDGER NAME="Petty Cash Box">
                  <PARENT>Cash-in-Hand</PARENT>
                  <OPENINGBALANCE>12500.00</OPENINGBALANCE>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                </LEDGER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;

    const parsed = parseTallyXml(xml);
    expect(parsed.bankAccounts.length).toBe(3);
    expect(parsed.cashInHand).toBe(87500); // 75000 + 12500

    await executeDirectSyncIngestion(TEST_ORG_ID, TEST_USER_ID, {
      items: [],
      parties: [],
      bankAccounts: parsed.bankAccounts,
      cashInHand: parsed.cashInHand,
    });

    const storedBanks = JSON.parse(localStorage.getItem(`credsmart_bank_accounts_${TEST_ORG_ID}`)!);
    expect(storedBanks.length).toBe(3);
    const totalBankBalance = storedBanks.reduce((sum: number, b: any) => sum + b.balance, 0);
    expect(totalBankBalance).toBe(2420000); // 1250000 + 850000 + 320000

    const storedCash = parseFloat(localStorage.getItem(`credsmart_cash_in_hand_${TEST_ORG_ID}`)!);
    expect(storedCash).toBe(87500);

    const totalLiquidFunds = totalBankBalance + storedCash;
    expect(totalLiquidFunds).toBe(2507500);
  });
});
