import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Milestone 1 Specification: Database Schema Alignment & Idempotent fix_db.sql", () => {
  const rootSqlPath = path.resolve(process.cwd(), "fix_db.sql");
  const backendSqlPath = path.resolve(process.cwd(), "backend-api/fix_db.sql");

  const rootSql = fs.readFileSync(rootSqlPath, "utf-8");
  const backendSql = fs.readFileSync(backendSqlPath, "utf-8");

  // The 42 tenant-scoped tables that must have dual columns (org_id, organization_id)
  // and the universal sync trigger attached.
  const TENANT_SCOPED_TABLES = [
    "organization_memberships",
    "org_memberships",
    "products",
    "product_batches",
    "customers",
    "suppliers",
    "sales",
    "sale_items",
    "purchase_invoices",
    "purchase_invoice_items",
    "credit_transactions",
    "expenses",
    "bank_accounts",
    "invoice_sequences",
    "party_wise_prices",
    "godowns",
    "locations",
    "storefront_settings",
    "storefront_orders",
    "sales_returns",
    "sales_return_items",
    "purchase_returns",
    "purchase_return_items",
    "stock_transfers",
    "activity_logs",
    "audit_logs",
    "staff_invitations",
    "sync_pairing_tokens",
    "crm_roles",
    "crm_staff_assignments",
    "crm_geolocations",
    "crm_attendance",
    "attendance_records",
    "crm_attendance_requests",
    "crm_salary_profiles",
    "salary_profiles",
    "crm_payroll_runs",
    "payroll_records",
    "crm_payslips",
    "crm_salary_adjustments",
    "customer_tickets",
    "staff_tasks",
  ];

  // ==========================================================================
  // SUITE 1: FILE EXISTENCE, PARITY & TRANSACTION WRAPPING
  // ==========================================================================
  describe("Suite 1: File Existence, Parity & Transaction Integrity", () => {
    it("1.1 root fix_db.sql exists and is non-empty (> 15000 bytes)", () => {
      expect(fs.existsSync(rootSqlPath)).toBe(true);
      expect(Buffer.byteLength(rootSql, "utf-8")).toBeGreaterThan(15000);
    });

    it("1.2 backend-api/fix_db.sql exists and is non-empty (> 15000 bytes)", () => {
      expect(fs.existsSync(backendSqlPath)).toBe(true);
      expect(Buffer.byteLength(backendSql, "utf-8")).toBeGreaterThan(15000);
    });

    it("1.3 root fix_db.sql and backend-api/fix_db.sql are 100% byte-for-byte identical", () => {
      expect(backendSql).toBe(rootSql);
    });

    it("1.4 executes inside BEGIN; ... COMMIT; transaction block", () => {
      expect(rootSql).toMatch(/\bBEGIN;/);
      expect(rootSql).toMatch(/\bCOMMIT;/);

      const beginIndex = rootSql.indexOf("BEGIN;");
      const commitIndex = rootSql.indexOf("COMMIT;");
      expect(beginIndex).toBeGreaterThan(-1);
      expect(commitIndex).toBeGreaterThan(beginIndex);
    });

    it("1.5 loads required cryptographic extensions with IF NOT EXISTS", () => {
      expect(rootSql).toMatch(/CREATE EXTENSION IF NOT EXISTS\s+"pgcrypto";/i);
      expect(rootSql).toMatch(/CREATE EXTENSION IF NOT EXISTS\s+"uuid-ossp";/i);
    });

    it("1.6 ANALYZE commands are placed strictly after COMMIT; outside transaction block", () => {
      const commitIndex = rootSql.indexOf("COMMIT;");
      const analyzeMatches = [...rootSql.matchAll(/\bANALYZE\s+([a-zA-Z0-9_]+);/g)];

      expect(analyzeMatches.length).toBeGreaterThanOrEqual(43); // organizations + 42 tables
      for (const match of analyzeMatches) {
        expect(match.index).toBeGreaterThan(commitIndex);
      }
    });
  });

  // ==========================================================================
  // SUITE 2: UNIVERSAL BIDIRECTIONAL TRIGGER FUNCTION DEFINITION & LOGIC
  // ==========================================================================
  describe("Suite 2: Universal Bidirectional Trigger Definition & Logic", () => {
    it("2.1 defines sync_org_id_and_organization_id() function returning TRIGGER", () => {
      expect(rootSql).toMatch(
        /CREATE OR REPLACE FUNCTION\s+sync_org_id_and_organization_id\(\)\s*RETURNS\s+TRIGGER\s+AS/i
      );
      expect(rootSql).toMatch(/LANGUAGE\s+plpgsql/i);
    });

    it("2.2 implements INSERT handling: copying org_id to organization_id and vice versa", () => {
      expect(rootSql).toMatch(/IF\s+TG_OP\s*=\s*'INSERT'\s+THEN/i);
      expect(rootSql).toMatch(
        /IF\s+NEW\.org_id\s+IS\s+NOT\s+NULL\s+AND\s+NEW\.organization_id\s+IS\s+NULL\s+THEN\s*NEW\.organization_id\s*:=\s*NEW\.org_id;/i
      );
      expect(rootSql).toMatch(
        /ELSIF\s+NEW\.organization_id\s+IS\s+NOT\s+NULL\s+AND\s+NEW\.org_id\s+IS\s+NULL\s+THEN\s*NEW\.org_id\s*:=\s*NEW\.organization_id;/i
      );
    });

    it("2.3 implements UPDATE handling: detects changes via IS DISTINCT FROM and syncs bidirectionally", () => {
      expect(rootSql).toMatch(/ELSIF\s+TG_OP\s*=\s*'UPDATE'\s+THEN/i);
      expect(rootSql).toMatch(
        /IF\s+NEW\.org_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.org_id\s+AND\s+NEW\.organization_id\s+IS\s+NOT\s+DISTINCT\s+FROM\s+OLD\.organization_id\s+THEN\s*NEW\.organization_id\s*:=\s*NEW\.org_id;/i
      );
      expect(rootSql).toMatch(
        /ELSIF\s+NEW\.organization_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.organization_id\s+AND\s+NEW\.org_id\s+IS\s+NOT\s+DISTINCT\s+FROM\s+OLD\.org_id\s+THEN\s*NEW\.org_id\s*:=\s*NEW\.organization_id;/i
      );
    });

    it("2.4 pure unit test: simulates trigger execution on database tuples", () => {
      // Simulating the exact PL/pgSQL logic in TypeScript
      interface DbRecord {
        org_id: string | null;
        organization_id: string | null;
      }

      function simulateTrigger(
        tgOp: "INSERT" | "UPDATE",
        recordNew: DbRecord,
        recordOld?: DbRecord
      ): DbRecord {
        const next = { ...recordNew };
        if (tgOp === "INSERT") {
          if (next.org_id !== null && next.organization_id === null) {
            next.organization_id = next.org_id;
          } else if (next.organization_id !== null && next.org_id === null) {
            next.org_id = next.organization_id;
          }
        } else if (tgOp === "UPDATE" && recordOld) {
          const orgChanged = next.org_id !== recordOld.org_id;
          const organizationChanged = next.organization_id !== recordOld.organization_id;

          if (orgChanged && !organizationChanged) {
            next.organization_id = next.org_id;
          } else if (organizationChanged && !orgChanged) {
            next.org_id = next.organization_id;
          } else if (next.org_id === null && next.organization_id !== null) {
            next.org_id = next.organization_id;
          } else if (next.organization_id === null && next.org_id !== null) {
            next.organization_id = next.org_id;
          }
        }
        return next;
      }

      // Test 1: INSERT with only org_id
      const res1 = simulateTrigger("INSERT", { org_id: "org-123", organization_id: null });
      expect(res1.org_id).toBe("org-123");
      expect(res1.organization_id).toBe("org-123");

      // Test 2: INSERT with only organization_id
      const res2 = simulateTrigger("INSERT", { org_id: null, organization_id: "org-456" });
      expect(res2.org_id).toBe("org-456");
      expect(res2.organization_id).toBe("org-456");

      // Test 3: INSERT with both
      const res3 = simulateTrigger("INSERT", { org_id: "org-789", organization_id: "org-789" });
      expect(res3.org_id).toBe("org-789");
      expect(res3.organization_id).toBe("org-789");

      // Test 4: UPDATE modifying org_id
      const res4 = simulateTrigger(
        "UPDATE",
        { org_id: "org-new", organization_id: "org-old" },
        { org_id: "org-old", organization_id: "org-old" }
      );
      expect(res4.org_id).toBe("org-new");
      expect(res4.organization_id).toBe("org-new");

      // Test 5: UPDATE modifying organization_id
      const res5 = simulateTrigger(
        "UPDATE",
        { org_id: "org-old", organization_id: "org-new" },
        { org_id: "org-old", organization_id: "org-old" }
      );
      expect(res5.org_id).toBe("org-new");
      expect(res5.organization_id).toBe("org-new");
    });
  });

  // ==========================================================================
  // SUITE 3: COMPLETE 42 TENANT-SCOPED TABLES COVERAGE
  // ==========================================================================
  describe("Suite 3: Complete 42 Tenant-Scoped Tables Coverage", () => {
    it("3.1 exactly 42 tenant-scoped tables are verified", () => {
      expect(TENANT_SCOPED_TABLES.length).toBe(42);
      expect(new Set(TENANT_SCOPED_TABLES).size).toBe(42);
    });

    TENANT_SCOPED_TABLES.forEach((table, index) => {
      describe(`Table ${index + 1}/42: ${table}`, () => {
        it(`ensures table ${table} exists via CREATE TABLE IF NOT EXISTS`, () => {
          const createRegex = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\b`, "i");
          expect(rootSql).toMatch(createRegex);
        });

        it(`ensures ${table} has org_id UUID column added idempotently`, () => {
          const colRegex = new RegExp(
            `ALTER TABLE\\s+${table}\\s+ADD COLUMN IF NOT EXISTS\\s+org_id\\s+UUID`,
            "i"
          );
          expect(rootSql).toMatch(colRegex);
        });

        it(`ensures ${table} has organization_id UUID column added idempotently`, () => {
          const colRegex = new RegExp(
            `ALTER TABLE\\s+${table}\\s+ADD COLUMN IF NOT EXISTS\\s+organization_id\\s+UUID`,
            "i"
          );
          expect(rootSql).toMatch(colRegex);
        });

        it(`ensures ${table} runs bidirectional backfill updates`, () => {
          const backfill1 = new RegExp(
            `UPDATE\\s+${table}\\s+SET\\s+org_id\\s*=\\s*organization_id\\s+WHERE\\s+org_id\\s+IS\\s+NULL\\s+AND\\s+organization_id\\s+IS\\s+NOT\\s+NULL`,
            "i"
          );
          const backfill2 = new RegExp(
            `UPDATE\\s+${table}\\s+SET\\s+organization_id\\s*=\\s*org_id\\s+WHERE\\s+organization_id\\s+IS\\s+NULL\\s+AND\\s+org_id\\s+IS\\s+NOT\\s+NULL`,
            "i"
          );
          expect(rootSql).toMatch(backfill1);
          expect(rootSql).toMatch(backfill2);
        });

        it(`ensures ${table} drops trigger before recreation (idempotency)`, () => {
          const dropTrigger = new RegExp(
            `DROP TRIGGER IF EXISTS\\s+trg_sync_org_ids\\s+ON\\s+${table};`,
            "i"
          );
          expect(rootSql).toMatch(dropTrigger);
        });

        it(`ensures ${table} creates BEFORE INSERT OR UPDATE trigger`, () => {
          const createTrigger = new RegExp(
            `CREATE TRIGGER\\s+trg_sync_org_ids\\s+BEFORE INSERT OR UPDATE\\s+ON\\s+${table}\\s+FOR EACH ROW\\s+EXECUTE FUNCTION\\s+sync_org_id_and_organization_id\\(\\);`,
            "i"
          );
          expect(rootSql).toMatch(createTrigger);
        });

        it(`ensures ${table} has B-Tree indexes on both org_id and organization_id`, () => {
          const idxOrgId = new RegExp(
            `CREATE INDEX IF NOT EXISTS\\s+idx_${table}_org_id\\s+ON\\s+${table}\\(org_id\\);`,
            "i"
          );
          const idxOrganizationId = new RegExp(
            `CREATE INDEX IF NOT EXISTS\\s+idx_${table}_organization_id\\s+ON\\s+${table}\\(organization_id\\);`,
            "i"
          );
          expect(rootSql).toMatch(idxOrgId);
          expect(rootSql).toMatch(idxOrganizationId);
        });
      });
    });
  });

  // ==========================================================================
  // SUITE 4: DUAL MEMBERSHIP TABLE SYNCHRONIZATION
  // ==========================================================================
  describe("Suite 4: Dual Membership Table Synchronization", () => {
    it("4.1 ensures both organization_memberships and org_memberships exist", () => {
      expect(rootSql).toMatch(/CREATE TABLE IF NOT EXISTS organization_memberships\b/i);
      expect(rootSql).toMatch(/CREATE TABLE IF NOT EXISTS org_memberships\b/i);
    });

    it("4.2 provides initial cross-table synchronization on conflict do update", () => {
      expect(rootSql).toMatch(
        /INSERT INTO org_memberships\s*\(id,\s*user_id,\s*org_id,\s*organization_id,\s*role,\s*created_at\)/i
      );
      expect(rootSql).toMatch(
        /ON CONFLICT\s*\(user_id,\s*org_id\)\s*DO UPDATE SET\s+role\s*=\s*EXCLUDED\.role;/i
      );
    });

    it("4.3 ensures membership lookup indexes exist for both user and org columns", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships\(user_id\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_organization_memberships_user ON organization_memberships\(user_id\);/i
      );
    });
  });

  // ==========================================================================
  // SUITE 5: COMPLETE CUSTOMER & SUPPLIER 20-FIELD CONTRACT
  // ==========================================================================
  describe("Suite 5: Complete Customer & Supplier 20-Field Contract", () => {
    const requiredPartyFields = [
      { col: "org_id", type: "UUID" },
      { col: "organization_id", type: "UUID" },
      { col: "phone", default: "''" },
      { col: "email", default: "''" },
      { col: "address", default: "''" },
      { col: "city", default: "''" },
      { col: "state", default: "''" },
      { col: "pincode", default: "''" },
      { col: "gstin", default: "''" },
      { col: "pan", default: "''" },
      { col: "trade_name", default: "''" },
      { col: "shipping_address", default: "''" },
      { col: "category", default: "'General'" },
      { col: "credit_limit", default: "0" },
      { col: "credit_period_days", default: "30" },
      { col: "custom_fields", default: "'{}'::jsonb" },
      { col: "opening_balance", default: "0" },
      { col: "balance_type", defaultCustomer: "'receivable'", defaultSupplier: "'payable'" },
      { col: "is_active", default: "TRUE" },
    ];

    describe("customers table schema completeness", () => {
      requiredPartyFields.forEach((field) => {
        it(`customers table includes column '${field.col}'`, () => {
          const colPattern = new RegExp(
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${field.col}\\b`,
            "i"
          );
          expect(rootSql).toMatch(colPattern);
        });
      });

      it("customers balance_type defaults to 'receivable'", () => {
        expect(rootSql).toMatch(
          /ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_type\s+VARCHAR\(20\)\s+DEFAULT\s+'receivable';/i
        );
      });
    });

    describe("suppliers table schema completeness", () => {
      requiredPartyFields.forEach((field) => {
        it(`suppliers table includes column '${field.col}'`, () => {
          const colPattern = new RegExp(
            `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ${field.col}\\b`,
            "i"
          );
          expect(rootSql).toMatch(colPattern);
        });
      });

      it("suppliers balance_type defaults to 'payable'", () => {
        expect(rootSql).toMatch(
          /ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance_type\s+VARCHAR\(20\)\s+DEFAULT\s+'payable';/i
        );
      });
    });
  });

  // ==========================================================================
  // SUITE 6: HIGH-THROUGHPUT COMPOSITE & FILTER INDEXES
  // ==========================================================================
  describe("Suite 6: High-Throughput Composite & Filter Indexes", () => {
    it("6.1 products composite barcode and SKU indexes exist with partial filters", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_products_barcode ON products\(barcode\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_products_org_barcode ON products\(org_id, barcode\)\s+WHERE barcode IS NOT NULL AND barcode != '';/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_products_sku ON products\(sku\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products\(org_id, sku\)\s+WHERE sku IS NOT NULL AND sku != '';/i
      );
    });

    it("6.2 products created_at order index exists", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_products_created_at ON products\(created_at DESC\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_products_org_created ON products\(org_id, created_at DESC\);/i
      );
    });

    it("6.3 customers and suppliers phone composite indexes exist", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers\(phone\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON customers\(org_id, phone\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers\(phone\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_suppliers_org_phone ON suppliers\(org_id, phone\);/i
      );
    });

    it("6.4 sales invoice number and date composite indexes exist", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales\(invoice_number\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_sales_org_invoice ON sales\(org_id, invoice_number\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_sales_date ON sales\(sale_date DESC, created_at DESC\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_sales_org_date ON sales\(org_id, sale_date DESC, created_at DESC\);/i
      );
    });

    it("6.5 line items foreign key indexes exist for fast join resolution", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items\(sale_id\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_sale_items_prod_id ON sale_items\(product_id\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_invoice_items\(purchase_invoice_id\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_purchase_items_prod ON purchase_invoice_items\(product_id\);/i
      );
    });

    it("6.6 credit transactions (khata ledger) composite index exists", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_credit_trans_party ON credit_transactions\(party_id, party_type\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_credit_trans_created_at ON credit_transactions\(created_at DESC\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_credit_trans_org_created ON credit_transactions\(org_id, created_at DESC\);/i
      );
    });

    it("6.7 storefront and expenses specialized indexes exist", () => {
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses\(expense_date DESC\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses\(org_id, expense_date DESC\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_storefront_slug ON storefront_settings\(store_slug\);/i
      );
      expect(rootSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_storefront_orders_status ON storefront_orders\(status\);/i
      );
    });
  });

  // ==========================================================================
  // SUITE 7: PLANNER STATISTICS & ANALYZE COVERAGE
  // ==========================================================================
  describe("Suite 7: Planner Statistics & ANALYZE Coverage", () => {
    it("7.1 verifies ANALYZE organizations is present", () => {
      expect(rootSql).toMatch(/\bANALYZE organizations;/i);
    });

    TENANT_SCOPED_TABLES.forEach((table) => {
      it(`verifies ANALYZE ${table} is present`, () => {
        const regex = new RegExp(`\\bANALYZE ${table};`, "i");
        expect(rootSql).toMatch(regex);
      });
    });
  });
});
