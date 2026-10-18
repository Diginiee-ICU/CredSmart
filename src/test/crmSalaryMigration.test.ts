import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Milestone 1 Specification: CRM Phase 3 Salary Migration & Schema Contracts", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261017020000_create_crm_salary_tables.sql"
  );

  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  // Helper: Extract statements cleanly ignoring comments, tracking quotes and paren depth
  const splitSqlStatements = (sql: string): string[] => {
    const cleanSql = sql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    const statements: string[] = [];
    let current = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let parenDepth = 0;

    for (let i = 0; i < cleanSql.length; i++) {
      const char = cleanSql[i];
      const prev = i > 0 ? cleanSql[i - 1] : "";

      if (char === "'" && prev !== "\\") {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prev !== "\\") {
        inDoubleQuote = !inDoubleQuote;
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === "(") parenDepth++;
        else if (char === ")") parenDepth--;
      }

      if (char === ";" && !inSingleQuote && !inDoubleQuote && parenDepth === 0) {
        const trimmed = current.trim();
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim().length > 0) {
      statements.push(current.trim());
    }

    return statements;
  };

  // ==========================================================================
  // SUITE 1: FILE EXISTENCE, NAMING & TRANSACTION WRAPPING
  // ==========================================================================
  describe("Suite 1: File Existence, Naming & Transaction Wrapping", () => {
    it("1. migration file exists with timestamp 20261017020000 and is non-empty (> 1000 bytes)", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      expect(path.basename(migrationPath)).toBe("20261017020000_create_crm_salary_tables.sql");
      expect(migrationSql.length).toBeGreaterThan(1000);
    });

    it("2. verifies transactional block wrapping (starts with BEGIN; and ends with COMMIT;)", () => {
      const trimmed = migrationSql.trim();
      expect(trimmed.startsWith("BEGIN;")).toBe(true);
      expect(trimmed.endsWith("COMMIT;")).toBe(true);
    });

    it("3. validates balanced single and double quotes across the entire migration", () => {
      // Strip escaped quotes ''
      const unescaped = migrationSql.replace(/''/g, "");
      const singleQuotes = (unescaped.match(/'/g) || []).length;
      expect(singleQuotes % 2).toBe(0);

      const doubleQuotes = (migrationSql.match(/"/g) || []).length;
      expect(doubleQuotes % 2).toBe(0);
    });

    it("4. validates balanced parentheses across the entire migration file", () => {
      let openP = 0;
      let closeP = 0;
      let inQuote = false;

      for (let i = 0; i < migrationSql.length; i++) {
        const char = migrationSql[i];
        if (char === "'" && migrationSql[i - 1] !== "\\") inQuote = !inQuote;
        if (!inQuote) {
          if (char === "(") openP++;
          if (char === ")") closeP++;
        }
      }
      expect(openP).toBe(closeP);
      expect(openP).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SUITE 2: DDL STATEMENT INTEGRITY & PARSING
  // ==========================================================================
  describe("Suite 2: DDL Statement Integrity & Parsing", () => {
    it("5. confirms all DDL statements start with recognized SQL keywords", () => {
      const statements = splitSqlStatements(migrationSql);
      expect(statements.length).toBeGreaterThanOrEqual(25);

      for (const stmt of statements) {
        if (stmt === "BEGIN" || stmt === "COMMIT") continue;
        const startsWithValidKeyword = /^(CREATE|ALTER|DROP|GRANT|REVOKE)\b/i.test(stmt);
        expect(
          startsWithValidKeyword,
          `Statement does not start with valid DDL keyword: ${stmt.slice(0, 45)}...`
        ).toBe(true);
      }
    });

    it("6. validates each DDL statement has balanced parentheses internally", () => {
      const statements = splitSqlStatements(migrationSql);
      for (const stmt of statements) {
        let openP = 0;
        let closeP = 0;
        let inQuote = false;
        for (let i = 0; i < stmt.length; i++) {
          const char = stmt[i];
          if (char === "'" && stmt[i - 1] !== "\\") inQuote = !inQuote;
          if (!inQuote) {
            if (char === "(") openP++;
            if (char === ")") closeP++;
          }
        }
        expect(openP, `Unbalanced parens in statement: ${stmt.slice(0, 50)}...`).toBe(closeP);
      }
    });
  });

  // ==========================================================================
  // SUITE 3: TABLE SCHEMAS, COLUMNS & PRIMARY KEYS
  // ==========================================================================
  describe("Suite 3: Table Schemas, Columns & Primary Keys", () => {
    it("7. validates crm_salary_profiles schema contracts and column specifications", () => {
      // Table creation
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_salary_profiles\s*\(/i);

      // Primary Key
      expect(migrationSql).toMatch(/id\s+UUID\s+(NOT\s+NULL\s+)?(DEFAULT\s+gen_random_uuid\(\)\s+)?PRIMARY\s+KEY/i);

      // Columns
      expect(migrationSql).toMatch(/org_id\s+UUID\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/staff_id\s+UUID\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/salary_type\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'monthly'/i);
      expect(migrationSql).toMatch(/base_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/currency\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'INR'/i);
      expect(migrationSql).toMatch(/allowed_leaves_per_month\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+2/i);
      expect(migrationSql).toMatch(/hourly_overtime_rate\s+NUMERIC\(10,\s*2\)\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/pf_deduction_percent\s+NUMERIC\(5,\s*2\)\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/esi_deduction_percent\s+NUMERIC\(5,\s*2\)\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/is_active\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+true/i);
      expect(migrationSql).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+now\(\)/i);
      expect(migrationSql).toMatch(/updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+now\(\)/i);
    });

    it("8. validates crm_payroll_runs schema contracts and column specifications", () => {
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_payroll_runs\s*\(/i);
      expect(migrationSql).toMatch(/month_year\s+TEXT\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'draft'/i);
      expect(migrationSql).toMatch(/total_payout\s+NUMERIC\(14,\s*2\)\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/staff_count\s+INTEGER\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/locked_by\s+UUID/i);
      expect(migrationSql).toMatch(/locked_at\s+TIMESTAMPTZ/i);
      expect(migrationSql).toMatch(/notes\s+TEXT/i);
    });

    it("9. validates crm_payslips schema contracts and comprehensive column set", () => {
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_payslips\s*\(/i);
      expect(migrationSql).toMatch(/payroll_run_id\s+UUID\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/salary_profile_snapshot\s+JSONB\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/working_days_in_month\s+INTEGER\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/present_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/absent_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/half_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/lop_days\s+NUMERIC\(5,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/overtime_minutes\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/gross_salary\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/lop_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/overtime_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/pf_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/esi_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/advance_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/bonus_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/net_salary\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i);
      expect(migrationSql).toMatch(/payment_status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i);
      expect(migrationSql).toMatch(/paid_at\s+TIMESTAMPTZ/i);
    });

    it("10. validates crm_salary_adjustments schema contracts and column specifications", () => {
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_salary_adjustments\s*\(/i);
      expect(migrationSql).toMatch(/type\s+TEXT\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/description\s+TEXT/i);
      expect(migrationSql).toMatch(/month_year\s+TEXT/i);
      expect(migrationSql).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i);
      expect(migrationSql).toMatch(/requested_by\s+UUID/i);
      expect(migrationSql).toMatch(/approved_by\s+UUID/i);
      expect(migrationSql).toMatch(/approved_at\s+TIMESTAMPTZ/i);
    });
  });

  // ==========================================================================
  // SUITE 4: FOREIGN KEYS & CASCADE RULES
  // ==========================================================================
  describe("Suite 4: Foreign Keys & Cascade Rules", () => {
    it("11. verifies foreign key references and CASCADE/SET NULL delete behaviors", () => {
      // Organizations CASCADE
      expect(migrationSql).toMatch(/org_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.organizations\(id\)\s+ON\s+DELETE\s+CASCADE/i);

      // Staff users CASCADE
      expect(migrationSql).toMatch(/staff_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+CASCADE/i);

      // Payroll run CASCADE in crm_payslips
      expect(migrationSql).toMatch(/payroll_run_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.crm_payroll_runs\(id\)\s+ON\s+DELETE\s+CASCADE/i);

      // Nullable user references with SET NULL
      expect(migrationSql).toMatch(/locked_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i);
      expect(migrationSql).toMatch(/requested_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i);
      expect(migrationSql).toMatch(/approved_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i);
    });
  });

  // ==========================================================================
  // SUITE 5: UNIQUE & CHECK CONSTRAINTS
  // ==========================================================================
  describe("Suite 5: Unique & CHECK Constraints", () => {
    it("12. validates all required UNIQUE constraints exist across tables", () => {
      // crm_salary_profiles UNIQUE(org_id, staff_id)
      expect(migrationSql).toMatch(
        /CONSTRAINT\s+uq_crm_salary_profiles_staff\s+UNIQUE\s*\(\s*org_id\s*,\s*staff_id\s*\)/i
      );

      // crm_payroll_runs UNIQUE(org_id, month_year)
      expect(migrationSql).toMatch(
        /CONSTRAINT\s+uq_crm_payroll_runs_month\s+UNIQUE\s*\(\s*org_id\s*,\s*month_year\s*\)/i
      );

      // crm_payslips UNIQUE(org_id, staff_id, month_year)
      expect(migrationSql).toMatch(
        /CONSTRAINT\s+uq_crm_payslips_staff_month\s+UNIQUE\s*\(\s*org_id\s*,\s*staff_id\s*,\s*month_year\s*\)/i
      );
    });

    it("13. validates domain CHECK constraints on enum-like string fields", () => {
      // salary_type CHECK
      expect(migrationSql).toMatch(
        /salary_type\s+TEXT[^\n;]*CHECK\s*\(\s*salary_type\s+IN\s*\(\s*'monthly'\s*,\s*'daily'\s*,\s*'hourly'\s*\)\s*\)/i
      );

      // crm_payroll_runs.status CHECK
      expect(migrationSql).toMatch(
        /status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(\s*'draft'\s*,\s*'locked'\s*,\s*'disbursed'\s*\)\s*\)/i
      );

      // crm_payslips.payment_status CHECK
      expect(migrationSql).toMatch(
        /payment_status\s+TEXT[^\n;]*CHECK\s*\(\s*payment_status\s+IN\s*\(\s*'pending'\s*,\s*'paid'\s*,\s*'partial'\s*\)\s*\)/i
      );

      // crm_salary_adjustments.type CHECK
      expect(migrationSql).toMatch(
        /type\s+TEXT[^\n;]*CHECK\s*\(\s*type\s+IN\s*\(\s*'advance'\s*,\s*'bonus'\s*,\s*'deduction'\s*,\s*'loan_repayment'\s*\)\s*\)/i
      );

      // crm_salary_adjustments.status CHECK
      expect(migrationSql).toMatch(
        /status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(\s*'pending'\s*,\s*'approved'\s*,\s*'deducted'\s*,\s*'rejected'\s*\)\s*\)/i
      );
    });
  });

  // ==========================================================================
  // SUITE 6: IDEMPOTENCY & REPEAT-EXECUTION ORACLE
  // ==========================================================================
  describe("Suite 6: Idempotency & Repeat-Execution Oracle", () => {
    it("14. ensures all CREATE TABLE statements use IF NOT EXISTS", () => {
      const tableMatches = migrationSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.\w+/gi) || [];
      expect(tableMatches.length).toBe(4);
      for (const match of tableMatches) {
        expect(match.toUpperCase()).toContain("IF NOT EXISTS");
      }
    });

    it("15. ensures all CREATE INDEX statements use IF NOT EXISTS (covering >= 12 indexes)", () => {
      const indexMatches = migrationSql.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+/gi) || [];
      expect(indexMatches.length).toBeGreaterThanOrEqual(12);
      for (const match of indexMatches) {
        expect(match.toUpperCase()).toContain("IF NOT EXISTS");
      }
    });

    it("16. ensures all triggers are preceded by DROP TRIGGER IF EXISTS", () => {
      const createTriggerMatches = Array.from(
        migrationSql.matchAll(/CREATE\s+TRIGGER\s+(\w+)\s+BEFORE\s+UPDATE\s+ON\s+public\.(\w+)/gi)
      );
      expect(createTriggerMatches.length).toBeGreaterThanOrEqual(3);

      for (const match of createTriggerMatches) {
        const triggerName = match[1];
        const tableName = match[2];
        const dropPattern = new RegExp(
          `DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${triggerName}\\s+ON\\s+public\\.${tableName};`,
          "i"
        );
        expect(dropPattern.test(migrationSql), `Missing DROP TRIGGER for ${triggerName} on ${tableName}`).toBe(true);
      }
    });

    it("17. ensures all policies are preceded by DROP POLICY IF EXISTS", () => {
      const createPolicyMatches = Array.from(
        migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.(\w+)/gi)
      );
      expect(createPolicyMatches.length).toBe(16);

      for (const match of createPolicyMatches) {
        const policyName = match[1];
        const tableName = match[2];
        const dropPattern = new RegExp(
          `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policyName}"\\s+ON\\s+public\\.${tableName};`,
          "i"
        );
        expect(dropPattern.test(migrationSql), `Missing DROP POLICY for "${policyName}" on ${tableName}`).toBe(true);
      }
    });

    it("18. simulates duplicate script execution oracle with zero unhandled collisions", () => {
      const statements = splitSqlStatements(migrationSql).filter(
        (s) => s !== "BEGIN" && s !== "COMMIT"
      );

      const riskyStatements = statements.filter((s) => {
        const upper = s.toUpperCase();
        if (upper.startsWith("CREATE TABLE") && !upper.includes("IF NOT EXISTS")) return true;
        if (upper.startsWith("CREATE INDEX") && !upper.includes("IF NOT EXISTS")) return true;
        if (upper.startsWith("CREATE POLICY")) return false; // Handled by preceding DROP
        if (upper.startsWith("CREATE TRIGGER")) return false; // Handled by preceding DROP
        if (upper.startsWith("ALTER TABLE") && upper.includes("ENABLE ROW LEVEL SECURITY")) return false;
        if (upper.startsWith("DROP")) return false;
        return false;
      });

      expect(riskyStatements.length).toBe(0);
    });
  });

  // ==========================================================================
  // SUITE 7: SECURITY & ROW-LEVEL SECURITY (RLS)
  // ==========================================================================
  describe("Suite 7: Security & Row-Level Security (RLS)", () => {
    it("19. verifies RLS is enabled on all 4 CRM salary tables", () => {
      const tables = [
        "crm_salary_profiles",
        "crm_payroll_runs",
        "crm_payslips",
        "crm_salary_adjustments",
      ];
      for (const table of tables) {
        const rlsPattern = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY;`, "i");
        expect(rlsPattern.test(migrationSql), `Missing ENABLE ROW LEVEL SECURITY for ${table}`).toBe(true);
      }
    });

    it("20. verifies comprehensive CRUD coverage (SELECT, INSERT, UPDATE, DELETE) for all 4 tables", () => {
      const tables = [
        "crm_salary_profiles",
        "crm_payroll_runs",
        "crm_payslips",
        "crm_salary_adjustments",
      ];
      const operations = ["SELECT", "INSERT", "UPDATE", "DELETE"];

      for (const table of tables) {
        for (const op of operations) {
          const regex = new RegExp(`CREATE\\s+POLICY[\\s\\S]*?ON\\s+public\\.${table}\\s+FOR\\s+${op}`, "i");
          expect(regex.test(migrationSql), `Missing ${op} policy on ${table}`).toBe(true);
        }
      }
    });

    it("21. verifies all policies enforce authenticated role and has_org_access(org_id)", () => {
      const policyDefinitions = Array.from(
        migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"[\s\S]*?;/gi)
      );
      expect(policyDefinitions.length).toBe(16);

      for (const policy of policyDefinitions) {
        const text = policy[0];
        expect(text).toContain("auth.role() = 'authenticated'");
        expect(text).toContain("has_org_access(org_id)");
      }
    });
  });

  // ==========================================================================
  // SUITE 8: TRIGGERS & TIMESTAMP AUTOMATION
  // ==========================================================================
  describe("Suite 8: Triggers & Timestamp Automation", () => {
    it("22. verifies updated_at triggers on crm_salary_profiles, crm_payroll_runs, and crm_payslips", () => {
      const tablesWithUpdatedAt = [
        "crm_salary_profiles",
        "crm_payroll_runs",
        "crm_payslips",
      ];

      for (const table of tablesWithUpdatedAt) {
        const triggerPattern = new RegExp(
          `CREATE\\s+TRIGGER\\s+update_${table}_updated_at\\s+BEFORE\\s+UPDATE\\s+ON\\s+public\\.${table}\\s+FOR\\s+EACH\\s+ROW\\s+EXECUTE\\s+FUNCTION\\s+public\\.update_updated_at\\(\\);`,
          "i"
        );
        expect(triggerPattern.test(migrationSql), `Missing updated_at trigger for ${table}`).toBe(true);
      }
    });
  });
});
