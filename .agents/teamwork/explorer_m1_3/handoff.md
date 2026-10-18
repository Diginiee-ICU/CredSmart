# M1-3 Investigation & Test Suite Architecture Report: Phase 3 Salary Migration & Types

**Explorer**: Explorer M1-3  
**Target Milestone**: Milestone 1 (Database Migration & TypeScript Types for Salary Management & Payroll Engine)  
**Parent Caller**: `caf7924e-19e5-4a1d-ae03-b43c66838dd3`  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_3`  
**Status**: Ready for Implementation  

---

## 1. Observation

### 1.1 Existing Migration Test Architecture
- **File**: `src/test/crmAttendanceMigrationStress.test.ts` (lines 1–405)
  - Successfully executed via command:
    `cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts`
    - Result: **31 passed (31)** in 5.10s.
  - Implements a pure Node.js `fs`-based static AST/regex SQL parser:
    - Custom SQL statement splitter (`splitSqlStatements`) tracking quote contexts (`'` and `"`) and nested parentheses (`parenDepth`).
    - Validates file existence (`fs.existsSync`) and transactional wrapping (`BEGIN;` ... `COMMIT;`).
    - Verifies parentheses balance: counts `(` vs `)` outside single quotes.
    - Verifies quote parity: strips escaped quotes `''` and checks `quotes.length % 2 === 0`.
    - Enforces idempotent DDL clauses: `IF NOT EXISTS` on `CREATE TABLE` and `CREATE INDEX`; `DROP TRIGGER IF EXISTS` before triggers; `DROP POLICY IF EXISTS` before RLS policies.
    - Enforces CHECK constraints with inline regexes (e.g. `CHECK (status IN ('present', 'absent', 'half_day', 'on_leave'))`).
    - Enforces RLS policies covering all 4 CRUD actions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) with `auth.role() = 'authenticated'` and `has_org_access(org_id)`.

### 1.2 Existing Type Verification Architecture
- **File**: `src/test/crmAttendanceTypes.challenger.test.ts` (lines 1–597)
  - Successfully executed via command:
    `cmd /c npx vitest run src/test/crmAttendanceTypes.challenger.test.ts`
    - Result: **18 passed (18)** in 4.69s.
  - Implements compile-time and runtime type assertion helpers:
    - Type utilities:
      ```typescript
      type Extends<T, U> = [T] extends [U] ? true : false;
      type ExactKeys<T, K extends string> = [keyof T] extends [K]
        ? [K] extends [keyof T]
          ? true
          : false
        : false;
      ```
    - Uses Vitest's native `expectTypeOf<Target>().toEqualTypeOf<Expected>()` for strict scalar, nullability, and union checks.
    - Validates `Database["public"]["Tables"][TableName]["Row"]` for exact key count and field nullability (`string | null`, `number | null`).
    - Validates `Database["public"]["Tables"][TableName]["Insert"]` minimal vs maximal payloads, verifying that missing mandatory non-default keys fail compilation via `Extends<BadPayload, Insert> = false`.
    - Validates `Database["public"]["Tables"][TableName]["Update"]` partiality (`{}` allowed, individual fields typed).
    - Validates `Database["public"]["Tables"][TableName]["Relationships"]` foreign keys, target tables, and target columns.
    - Validates Domain union literals (`AttendanceStatus = "present" | "absent" | ...`) and rejection of alien literals (`Extends<"vacation", AttendanceStatus> = false`).

### 1.3 Target SQL Migration Specification
- **Target File**: `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
- **Tables (4 tables)**:
  1. `public.crm_salary_profiles`:
     - Columns: `id` (UUID PK default `gen_random_uuid()`), `org_id` (FK `organizations(id)` CASCADE), `staff_id` (FK `auth.users(id)` CASCADE), `salary_type` (`TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly'))`), `base_amount` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `currency` (`TEXT NOT NULL DEFAULT 'INR'`), `allowed_leaves_per_month` (`INTEGER NOT NULL DEFAULT 2`), `hourly_overtime_rate` (`NUMERIC(10,2) DEFAULT 0.00`), `pf_deduction_percent` (`NUMERIC(5,2) DEFAULT 0.00`), `esi_deduction_percent` (`NUMERIC(5,2) DEFAULT 0.00`), `is_active` (`BOOLEAN NOT NULL DEFAULT true`), `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`), `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`).
     - Unique constraint: `CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)`.
  2. `public.crm_payroll_runs`:
     - Columns: `id` (UUID PK), `org_id` (FK `organizations(id)` CASCADE), `month_year` (`TEXT NOT NULL`), `status` (`TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'disbursed'))`), `total_payout` (`NUMERIC(14,2) DEFAULT 0.00`), `staff_count` (`INTEGER DEFAULT 0`), `locked_by` (FK `auth.users(id)` SET NULL), `locked_at` (`TIMESTAMPTZ`), `notes` (`TEXT`), `created_at`, `updated_at`.
     - Unique constraint: `CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)`.
  3. `public.crm_payslips`:
     - Columns: `id` (UUID PK), `org_id` (FK `organizations(id)` CASCADE), `payroll_run_id` (FK `public.crm_payroll_runs(id)` CASCADE), `staff_id` (FK `auth.users(id)` CASCADE), `month_year` (`TEXT NOT NULL`), `salary_profile_snapshot` (`JSONB NOT NULL`), `working_days_in_month` (`INTEGER NOT NULL`), `present_days` (`INTEGER NOT NULL DEFAULT 0`), `absent_days` (`INTEGER NOT NULL DEFAULT 0`), `half_days` (`INTEGER NOT NULL DEFAULT 0`), `lop_days` (`NUMERIC(5,2) NOT NULL DEFAULT 0`), `overtime_minutes` (`INTEGER NOT NULL DEFAULT 0`), `gross_salary` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `lop_deduction` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `overtime_amount` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `pf_deduction` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `esi_deduction` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `advance_deduction` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `bonus_amount` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `net_salary` (`NUMERIC(12,2) NOT NULL DEFAULT 0.00`), `payment_status` (`TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial'))`), `paid_at` (`TIMESTAMPTZ`), `created_at`, `updated_at`.
     - Unique constraint: `CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)`.
  4. `public.crm_salary_adjustments`:
     - Columns: `id` (UUID PK), `org_id` (FK `organizations(id)` CASCADE), `staff_id` (FK `auth.users(id)` CASCADE), `type` (`TEXT NOT NULL CHECK (type IN ('advance', 'bonus', 'deduction', 'loan_repayment'))`), `amount` (`NUMERIC(12,2) NOT NULL`), `description` (`TEXT`), `month_year` (`TEXT`), `status` (`TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deducted', 'rejected'))`), `requested_by` (FK `auth.users(id)` SET NULL), `approved_by` (FK `auth.users(id)` SET NULL), `approved_at` (`TIMESTAMPTZ`), `created_at`, `updated_at`.
- **Security & RLS**:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` on all 4 tables.
  - 16 policies (SELECT, INSERT, UPDATE, DELETE for each of the 4 tables).
  - All policies check `auth.role() = 'authenticated'` and `has_org_access(org_id)`.
  - All policies preceded by `DROP POLICY IF EXISTS ...`.

### 1.4 Target TypeScript Type Contracts
- **Supabase Integration**: `src/integrations/supabase/types.ts`
  - Must define `crm_salary_profiles`, `crm_payroll_runs`, `crm_payslips`, and `crm_salary_adjustments` under `Database["public"]["Tables"]`.
  - Properties must have precise typing: `NUMERIC` columns map to `number`, `JSONB` maps to `Json`, `TIMESTAMPTZ` / `DATE` / `TEXT` map to `string`, nullables explicitly unioned with `null`.
- **Domain Types**: `src/types/crmSalary.ts` and/or `src/utils/crmPayrollUtils.ts`
  - Exported union types:
    - `SalaryType = "monthly" | "daily" | "hourly"`
    - `PayrollRunStatus = "draft" | "locked" | "disbursed"`
    - `PaymentStatus = "pending" | "paid" | "partial"`
    - `AdjustmentType = "advance" | "bonus" | "deduction" | "loan_repayment"`
    - `AdjustmentStatus = "pending" | "approved" | "deducted" | "rejected"`
  - Exported interfaces:
    - `CRMSalaryProfile`
    - `CRMPayrollRun`
    - `CRMPayslip`
    - `CRMSalaryAdjustment`
    - `PayslipComputedData`
    - `SalaryProfileSnapshot`

---

## 2. Logic Chain

1. **Static Analysis of SQL Ensures Schema Invariants Before Execution**:
   Because CredSmart does not execute raw DDL in browser environments, migration verification relies on deterministic static analysis. As observed in `crmAttendanceMigrationStress.test.ts`, parsing the file directly ensures that syntax errors, missing `IF NOT EXISTS` clauses, un-dropped policies/triggers, invalid numeric precisions, or incorrect check constraints are caught before any database interaction occurs.

2. **Statement Splitting with Context Awareness Prevents False Failures**:
   DDL files contain semicolons within trigger definitions or string literals. The custom scanner from `crmAttendanceMigrationStress.test.ts` accurately balances quotes and parentheses, preventing premature statement splitting. Applying this exact algorithm to `crmSalaryMigration.test.ts` guarantees reliable statement extraction.

3. **Checking All 5 Constraint Categories Eliminates Runtime Divergence**:
   - Primary Keys: UUIDs with `gen_random_uuid()`
   - Foreign Keys: `ON DELETE CASCADE` on `org_id` and parent records; `ON DELETE SET NULL` on audit actors (`locked_by`, `requested_by`, `approved_by`)
   - Unique Constraints: prevents duplicate salary profiles per staff (`org_id, staff_id`), duplicate payroll runs per month (`org_id, month_year`), and duplicate payslips per staff per month (`org_id, staff_id, month_year`)
   - Check Constraints: enforces allowed domain enums at the database engine level
   - Defaults: prevents NULL insertion into financial aggregates (`0.00`, `'INR'`, `2`, `'draft'`, `'pending'`)

4. **Bi-Directional TypeScript Type Checking (`Row`, `Insert`, `Update`, `Domain`) Prevents Type Drift**:
   As observed in `crmAttendanceTypes.challenger.test.ts`:
   - Checking `ExactKeys<Row, ExpectedKeys>` ensures no omitted or extra columns.
   - `expectTypeOf<...>().toEqualTypeOf<...>()` verifies strict types including nullability.
   - Testing `Insert` against a minimal object verifies that columns with database defaults (`created_at`, `status`, `base_amount`) are truly optional in the client type definition, while mandatory foreign keys (`org_id`, `staff_id`) remain strictly required.
   - Negative assignability checks (`Extends<Bad, Good> = false`) prove the compiler rejects invalid payloads.
   - Checking domain models against raw Supabase rows validates that domain interfaces can ingest Supabase responses without runtime surprises.

---

## 3. Caveats

1. **Pre-Implementation Nature**:
   This test design is ready to be written once the worker begins Milestone 1. Running these tests before `20261017020000_create_crm_salary_tables.sql` and `src/types/crmSalary.ts` exist will naturally fail on file existence.
2. **PostgreSQL NUMERIC to TypeScript mapping**:
   In Supabase generated types, `NUMERIC(12,2)` is represented as `number`. JavaScript floating point numbers are standard IEEE 754, so domain utility calculations must apply `Math.round(x * 100) / 100` for currency safety.
3. **Trigger Reusability**:
   The `updated_at` column triggers should execute `public.update_updated_at()`, which already exists in the CredSmart database from Phase 1 and 2 migrations.
4. **No caveats** regarding testing framework availability: Vitest v3.2.4 is installed, fast (sub-5s per suite), and fully functional on Windows via `cmd /c npx vitest run`.

---

## 4. Conclusion & Recommended Test Architecture

### 4.1 Test Suite 1: `src/test/crmSalaryMigration.test.ts` (23 Tests Planned)

#### File Structure
```
src/test/crmSalaryMigration.test.ts
├── Suite 1: SQL File Existence & DDL Syntax Hygiene (6 tests)
│   ├── Test 1.1: Migration file exists and is non-empty (>1000 bytes)
│   ├── Test 1.2: Transactional block wrapping (BEGIN; ... COMMIT;)
│   ├── Test 1.3: Balanced parentheses across entire SQL content
│   ├── Test 1.4: Balanced single quotes (handling '' escape)
│   ├── Test 1.5: Balanced double quotes
│   └── Test 1.6: DDL statement splitter validates keywords (CREATE/ALTER/DROP/GRANT)
├── Suite 2: Table Declarations, Primary Keys & Column Definitions (6 tests)
│   ├── Test 2.1: Declares all 4 required tables with IF NOT EXISTS
│   ├── Test 2.2: Primary keys use UUID with gen_random_uuid()
│   ├── Test 2.3: Column types and precision in crm_salary_profiles
│   ├── Test 2.4: Column types and precision in crm_payroll_runs
│   ├── Test 2.5: Column types, JSONB snapshot, and precision in crm_payslips
│   └── Test 2.6: Column types and precision in crm_salary_adjustments
├── Suite 3: Constraints, Foreign Keys & CHECK Enums (6 tests)
│   ├── Test 3.1: Unique constraint uq_crm_salary_profiles_staff (org_id, staff_id)
│   ├── Test 3.2: Unique constraint uq_crm_payroll_runs_month (org_id, month_year)
│   ├── Test 3.3: Unique constraint uq_crm_payslips_staff_month (org_id, staff_id, month_year)
│   ├── Test 3.4: CHECK constraints on salary_type, payroll status, payment status
│   ├── Test 3.5: CHECK constraints on adjustment type and adjustment status
│   └── Test 3.6: Foreign keys and onDelete cascade/set null rules
├── Suite 4: Idempotency & Repeat-Execution Oracle (3 tests)
│   ├── Test 4.1: All CREATE TABLE and CREATE INDEX use IF NOT EXISTS
│   ├── Test 4.2: All triggers preceded by DROP TRIGGER IF EXISTS
│   └── Test 4.3: All policies preceded by DROP POLICY IF EXISTS
└── Suite 5: Security & Row-Level Security (RLS) (2 tests)
    ├── Test 5.1: Verifies RLS is enabled on all 4 tables
    └── Test 5.2: Verifies all 16 RLS policies enforce auth.role() and has_org_access
```

#### Drop-In Code Blueprint for `src/test/crmSalaryMigration.test.ts`
```typescript
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Milestone 1: CRM Phase 3 Salary Migration Static Analysis & Stress Test", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261017020000_create_crm_salary_tables.sql"
  );

  const migrationSql = fs.existsSync(migrationPath)
    ? fs.readFileSync(migrationPath, "utf-8")
    : "";

  const splitSqlStatements = (sql: string): string[] => {
    const cleanSql = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
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
        if (trimmed.length > 0) statements.push(trimmed);
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) statements.push(current.trim());
    return statements;
  };

  describe("Suite 1: SQL File Existence & DDL Syntax Hygiene", () => {
    it("migration file exists and is non-empty", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      expect(migrationSql.length).toBeGreaterThan(1000);
    });

    it("verifies proper transactional block wrapping (BEGIN ... COMMIT)", () => {
      const trimmed = migrationSql.trim();
      expect(trimmed.startsWith("BEGIN;")).toBe(true);
      expect(trimmed.endsWith("COMMIT;")).toBe(true);
    });

    it("validates balanced parentheses across the entire migration", () => {
      let openCount = 0;
      let closeCount = 0;
      let inQuote = false;
      for (let i = 0; i < migrationSql.length; i++) {
        const char = migrationSql[i];
        if (char === "'" && migrationSql[i - 1] !== "\\") inQuote = !inQuote;
        if (!inQuote) {
          if (char === "(") openCount++;
          if (char === ")") closeCount++;
        }
      }
      expect(openCount).toBe(closeCount);
      expect(openCount).toBeGreaterThan(0);
    });

    it("validates balanced single quotes (accounting for PostgreSQL '' escapes)", () => {
      const unescaped = migrationSql.replace(/''/g, "");
      const singleQuotes = (unescaped.match(/'/g) || []).length;
      expect(singleQuotes % 2).toBe(0);
    });

    it("validates balanced double quotes", () => {
      const doubleQuotes = (migrationSql.match(/"/g) || []).length;
      expect(doubleQuotes % 2).toBe(0);
    });

    it("parses all DDL statements and confirms valid DDL keywords", () => {
      const statements = splitSqlStatements(migrationSql);
      expect(statements.length).toBeGreaterThan(20);
      for (const stmt of statements) {
        if (stmt === "BEGIN" || stmt === "COMMIT") continue;
        const validKeyword = /^(CREATE|ALTER|DROP|GRANT|REVOKE|COMMENT)\b/i.test(stmt);
        expect(validKeyword, `Invalid DDL start: ${stmt.slice(0, 40)}`).toBe(true);
      }
    });
  });

  describe("Suite 2: Table Declarations, Primary Keys & Column Definitions", () => {
    it("declares all 4 required tables with IF NOT EXISTS", () => {
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.crm_salary_profiles\s*\(/i);
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.crm_payroll_runs\s*\(/i);
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.crm_payslips\s*\(/i);
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.crm_salary_adjustments\s*\(/i);
    });

    it("validates UUID primary keys with gen_random_uuid()", () => {
      const pkMatches = migrationSql.match(/id\s+UUID\s+(?:NOT\s+NULL\s+)?DEFAULT\s+gen_random_uuid\(\)\s+PRIMARY\s+KEY/gi) || [];
      expect(pkMatches.length).toBe(4);
    });

    it("validates column types and precision in crm_salary_profiles", () => {
      expect(migrationSql).toMatch(/base_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/currency\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'INR'/i);
      expect(migrationSql).toMatch(/allowed_leaves_per_month\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+2/i);
      expect(migrationSql).toMatch(/hourly_overtime_rate\s+NUMERIC\(10,\s*2\)\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/pf_deduction_percent\s+NUMERIC\(5,\s*2\)\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/esi_deduction_percent\s+NUMERIC\(5,\s*2\)\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/is_active\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+true/i);
    });

    it("validates column types and precision in crm_payroll_runs", () => {
      expect(migrationSql).toMatch(/month_year\s+TEXT\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/total_payout\s+NUMERIC\(14,\s*2\)\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/staff_count\s+INTEGER\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/locked_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i);
      expect(migrationSql).toMatch(/locked_at\s+TIMESTAMPTZ/i);
      expect(migrationSql).toMatch(/notes\s+TEXT/i);
    });

    it("validates column types, JSONB snapshot, and precision in crm_payslips", () => {
      expect(migrationSql).toMatch(/salary_profile_snapshot\s+JSONB\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/working_days_in_month\s+INTEGER\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/present_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/absent_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/half_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/lop_days\s+NUMERIC\(5,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/overtime_minutes\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/gross_salary\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/lop_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/overtime_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/pf_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/esi_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/advance_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/bonus_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/net_salary\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00/i);
      expect(migrationSql).toMatch(/paid_at\s+TIMESTAMPTZ/i);
    });

    it("validates column types and precision in crm_salary_adjustments", () => {
      expect(migrationSql).toMatch(/amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL/i);
      expect(migrationSql).toMatch(/description\s+TEXT/i);
      expect(migrationSql).toMatch(/month_year\s+TEXT/i);
      expect(migrationSql).toMatch(/requested_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i);
      expect(migrationSql).toMatch(/approved_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i);
      expect(migrationSql).toMatch(/approved_at\s+TIMESTAMPTZ/i);
    });
  });

  describe("Suite 3: Constraints, Foreign Keys & CHECK Enums", () => {
    it("validates unique constraints on all designated tables", () => {
      expect(migrationSql).toMatch(/CONSTRAINT\s+uq_crm_salary_profiles_staff\s+UNIQUE\s*\(\s*org_id\s*,\s*staff_id\s*\)/i);
      expect(migrationSql).toMatch(/CONSTRAINT\s+uq_crm_payroll_runs_month\s+UNIQUE\s*\(\s*org_id\s*,\s*month_year\s*\)/i);
      expect(migrationSql).toMatch(/CONSTRAINT\s+uq_crm_payslips_staff_month\s+UNIQUE\s*\(\s*org_id\s*,\s*staff_id\s*,\s*month_year\s*\)/i);
    });

    it("validates CHECK constraints on salary_type, payroll status, payment status", () => {
      expect(migrationSql).toMatch(/CHECK\s*\(\s*salary_type\s+IN\s*\(\s*'monthly'\s*,\s*'daily'\s*,\s*'hourly'\s*\)\s*\)/i);
      expect(migrationSql).toMatch(/CHECK\s*\(\s*status\s+IN\s*\(\s*'draft'\s*,\s*'locked'\s*,\s*'disbursed'\s*\)\s*\)/i);
      expect(migrationSql).toMatch(/CHECK\s*\(\s*payment_status\s+IN\s*\(\s*'pending'\s*,\s*'paid'\s*,\s*'partial'\s*\)\s*\)/i);
    });

    it("validates CHECK constraints on adjustment type and adjustment status", () => {
      expect(migrationSql).toMatch(/CHECK\s*\(\s*type\s+IN\s*\(\s*'advance'\s*,\s*'bonus'\s*,\s*'deduction'\s*,\s*'loan_repayment'\s*\)\s*\)/i);
      expect(migrationSql).toMatch(/CHECK\s*\(\s*status\s+IN\s*\(\s*'pending'\s*,\s*'approved'\s*,\s*'deducted'\s*,\s*'rejected'\s*\)\s*\)/i);
    });

    it("validates foreign keys and referential integrity actions", () => {
      // Cascades on org_id
      const orgCascades = migrationSql.match(/org_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.organizations\(id\)\s+ON\s+DELETE\s+CASCADE/gi) || [];
      expect(orgCascades.length).toBe(4);

      // Cascades on staff_id
      const staffCascades = migrationSql.match(/staff_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+CASCADE/gi) || [];
      expect(staffCascades.length).toBe(3);

      // Payslip payroll_run_id cascade
      expect(migrationSql).toMatch(/payroll_run_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.crm_payroll_runs\(id\)\s+ON\s+DELETE\s+CASCADE/i);
    });
  });

  describe("Suite 4: Idempotency & Repeat-Execution Oracle", () => {
    it("ensures all CREATE TABLE and CREATE INDEX use IF NOT EXISTS", () => {
      const createTableMatches = migrationSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.\w+/gi) || [];
      expect(createTableMatches.length).toBe(4);
      for (const m of createTableMatches) {
        expect(m.toUpperCase()).toContain("IF NOT EXISTS");
      }

      const createIndexMatches = migrationSql.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+/gi) || [];
      expect(createIndexMatches.length).toBeGreaterThanOrEqual(14);
      for (const m of createIndexMatches) {
        expect(m.toUpperCase()).toContain("IF NOT EXISTS");
      }
    });

    it("ensures all triggers are preceded by DROP TRIGGER IF EXISTS", () => {
      const triggerMatches = Array.from(migrationSql.matchAll(/CREATE\s+TRIGGER\s+(\w+)\s+BEFORE\s+UPDATE\s+ON\s+public\.(\w+)/gi));
      expect(triggerMatches.length).toBe(4);
      for (const match of triggerMatches) {
        const triggerName = match[1];
        const tableName = match[2];
        const dropPattern = new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${triggerName}\\s+ON\\s+public\\.${tableName};`, "i");
        expect(dropPattern.test(migrationSql), `Missing DROP TRIGGER for ${triggerName} on ${tableName}`).toBe(true);
      }
    });

    it("ensures all policies are preceded by DROP POLICY IF EXISTS", () => {
      const policyMatches = Array.from(migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.(\w+)/gi));
      expect(policyMatches.length).toBe(16);
      for (const match of policyMatches) {
        const policyName = match[1];
        const tableName = match[2];
        const dropPattern = new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policyName}"\\s+ON\\s+public\\.${tableName};`, "i");
        expect(dropPattern.test(migrationSql), `Missing DROP POLICY for "${policyName}" on ${tableName}`).toBe(true);
      }
    });
  });

  describe("Suite 5: Security & Row-Level Security (RLS)", () => {
    it("verifies RLS is enabled on all 4 tables", () => {
      expect(migrationSql).toContain("ALTER TABLE public.crm_salary_profiles ENABLE ROW LEVEL SECURITY;");
      expect(migrationSql).toContain("ALTER TABLE public.crm_payroll_runs ENABLE ROW LEVEL SECURITY;");
      expect(migrationSql).toContain("ALTER TABLE public.crm_payslips ENABLE ROW LEVEL SECURITY;");
      expect(migrationSql).toContain("ALTER TABLE public.crm_salary_adjustments ENABLE ROW LEVEL SECURITY;");
    });

    it("verifies all 16 RLS policies enforce auth.role() and has_org_access", () => {
      const policies = Array.from(migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"[\s\S]*?;/gi));
      expect(policies.length).toBe(16);
      for (const p of policies) {
        const text = p[0];
        expect(text).toContain("auth.role() = 'authenticated'");
        expect(text).toContain("has_org_access(org_id)");
      }
    });
  });
});
```

---

### 4.2 Test Suite 2: `src/test/crmSalaryTypes.test.ts` (17 Tests Planned)

#### File Structure
```
src/test/crmSalaryTypes.test.ts
├── Suite 1: Supabase Database Row Type Contracts & Nullability (4 tests)
│   ├── Test 1.1: crm_salary_profiles.Row exact 13 keys & types
│   ├── Test 1.2: crm_payroll_runs.Row exact 11 keys & types
│   ├── Test 1.3: crm_payslips.Row exact 24 keys & JSONB snapshot type
│   └── Test 1.4: crm_salary_adjustments.Row exact 12 keys & types
├── Suite 2: Supabase Insert & Update Partiality Contracts (5 tests)
│   ├── Test 2.1: crm_salary_profiles.Insert minimal vs full & negative type check
│   ├── Test 2.2: crm_payroll_runs.Insert minimal vs full & negative type check
│   ├── Test 2.3: crm_payslips.Insert minimal required fields & negative check
│   ├── Test 2.4: crm_salary_adjustments.Insert minimal vs full & negative check
│   └── Test 2.5: Update types allow empty object {} and partial single-field updates
├── Suite 3: Foreign Key Relationships in Supabase Database Type (2 tests)
│   ├── Test 3.1: Relationships on crm_salary_profiles and crm_payroll_runs
│   └── Test 3.2: Relationships on crm_payslips and crm_salary_adjustments
├── Suite 4: Domain Literal Union Types & Snapshot Contracts (3 tests)
│   ├── Test 4.1: SalaryType, PayrollRunStatus, PaymentStatus unions & invalid literal rejection
│   ├── Test 4.2: AdjustmentType and AdjustmentStatus unions & invalid literal rejection
│   └── Test 4.3: SalaryProfileSnapshot structure conforms to required snapshot schema
└── Suite 5: Domain Models, Computed Types & Transformation Ergonomics (3 tests)
    ├── Test 5.1: CRMSalaryProfile conforms to Row + UI enrichment
    ├── Test 5.2: PayslipComputedData has all 16 calculated metrics
    └── Test 5.3: Pure mapper transforms raw Supabase row to UI model handling nulls & fallbacks
```

#### Drop-In Code Blueprint for `src/test/crmSalaryTypes.test.ts`
```typescript
import { describe, it, expect, expectTypeOf } from "vitest";
import type { Database, Json } from "@/integrations/supabase/types";
import type {
  SalaryType,
  PayrollRunStatus,
  PaymentStatus,
  AdjustmentType,
  AdjustmentStatus,
  CRMSalaryProfile,
  CRMPayrollRun,
  CRMPayslip,
  CRMSalaryAdjustment,
  PayslipComputedData,
  SalaryProfileSnapshot,
} from "@/types/crmSalary";

// Type-level assertion helpers
type Extends<T, U> = [T] extends [U] ? true : false;
type ExactKeys<T, K extends string> = [keyof T] extends [K]
  ? [K] extends [keyof T]
    ? true
    : false
  : false;

describe("Milestone 1: CRM Phase 3 Salary TypeScript Type Completeness & Strictness", () => {
  describe("Suite 1: Supabase Database Row Type Contracts & Nullability", () => {
    it("empirically verifies crm_salary_profiles has exact 13 SQL columns in Row", () => {
      type ProfileRow = Database["public"]["Tables"]["crm_salary_profiles"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "salary_type"
        | "base_amount"
        | "currency"
        | "allowed_leaves_per_month"
        | "hourly_overtime_rate"
        | "pf_deduction_percent"
        | "esi_deduction_percent"
        | "is_active"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<ProfileRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<ProfileRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["staff_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["salary_type"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["base_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<ProfileRow["currency"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["allowed_leaves_per_month"]>().toEqualTypeOf<number>();
      expectTypeOf<ProfileRow["hourly_overtime_rate"]>().toEqualTypeOf<number | null>();
      expectTypeOf<ProfileRow["pf_deduction_percent"]>().toEqualTypeOf<number | null>();
      expectTypeOf<ProfileRow["esi_deduction_percent"]>().toEqualTypeOf<number | null>();
      expectTypeOf<ProfileRow["is_active"]>().toEqualTypeOf<boolean>();
      expectTypeOf<ProfileRow["created_at"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["updated_at"]>().toEqualTypeOf<string>();
    });

    it("empirically verifies crm_payroll_runs has exact 11 SQL columns in Row", () => {
      type RunRow = Database["public"]["Tables"]["crm_payroll_runs"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "month_year"
        | "status"
        | "total_payout"
        | "staff_count"
        | "locked_by"
        | "locked_at"
        | "notes"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<RunRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<RunRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<RunRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<RunRow["month_year"]>().toEqualTypeOf<string>();
      expectTypeOf<RunRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<RunRow["total_payout"]>().toEqualTypeOf<number | null>();
      expectTypeOf<RunRow["staff_count"]>().toEqualTypeOf<number | null>();
      expectTypeOf<RunRow["locked_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<RunRow["locked_at"]>().toEqualTypeOf<string | null>();
      expectTypeOf<RunRow["notes"]>().toEqualTypeOf<string | null>();
    });

    it("empirically verifies crm_payslips has exact 24 SQL columns in Row with JSONB snapshot", () => {
      type PayslipRow = Database["public"]["Tables"]["crm_payslips"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "payroll_run_id"
        | "staff_id"
        | "month_year"
        | "salary_profile_snapshot"
        | "working_days_in_month"
        | "present_days"
        | "absent_days"
        | "half_days"
        | "lop_days"
        | "overtime_minutes"
        | "gross_salary"
        | "lop_deduction"
        | "overtime_amount"
        | "pf_deduction"
        | "esi_deduction"
        | "advance_deduction"
        | "bonus_amount"
        | "net_salary"
        | "payment_status"
        | "paid_at"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<PayslipRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<PayslipRow["salary_profile_snapshot"]>().toEqualTypeOf<Json>();
      expectTypeOf<PayslipRow["working_days_in_month"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["lop_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["net_salary"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["paid_at"]>().toEqualTypeOf<string | null>();
    });

    it("empirically verifies crm_salary_adjustments has exact 12 SQL columns in Row", () => {
      type AdjRow = Database["public"]["Tables"]["crm_salary_adjustments"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "type"
        | "amount"
        | "description"
        | "month_year"
        | "status"
        | "requested_by"
        | "approved_by"
        | "approved_at"
        | "created_at";

      type KeysMatch = ExactKeys<AdjRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<AdjRow["type"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjRow["amount"]>().toEqualTypeOf<number>();
      expectTypeOf<AdjRow["description"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjRow["month_year"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjRow["requested_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjRow["approved_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjRow["approved_at"]>().toEqualTypeOf<string | null>();
    });
  });

  describe("Suite 2: Supabase Insert & Update Partiality Contracts", () => {
    it("validates minimal vs full payload for crm_salary_profiles.Insert and negative type check", () => {
      type ProfileInsert = Database["public"]["Tables"]["crm_salary_profiles"]["Insert"];
      const minimal: ProfileInsert = {
        org_id: "org-1",
        staff_id: "user-1",
      };
      expect(minimal.org_id).toBe("org-1");

      const full: ProfileInsert = {
        org_id: "org-1",
        staff_id: "user-1",
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 250,
        pf_deduction_percent: 12,
        esi_deduction_percent: 0.75,
        is_active: true,
      };
      expect(full.base_amount).toBe(50000);

      type MissingStaff = { org_id: string; base_amount: number };
      type CanAssignMissingStaff = Extends<MissingStaff, ProfileInsert>;
      const canAssignMissingStaff: CanAssignMissingStaff = false;
      expect(canAssignMissingStaff).toBe(false);
    });

    it("validates minimal vs full payload for crm_payroll_runs.Insert and negative type check", () => {
      type RunInsert = Database["public"]["Tables"]["crm_payroll_runs"]["Insert"];
      const minimal: RunInsert = {
        org_id: "org-1",
        month_year: "2026-10",
      };
      expect(minimal.month_year).toBe("2026-10");

      type MissingMonth = { org_id: string };
      type CanAssignMissingMonth = Extends<MissingMonth, RunInsert>;
      const canAssignMissingMonth: CanAssignMissingMonth = false;
      expect(canAssignMissingMonth).toBe(false);
    });

    it("validates minimal required fields for crm_payslips.Insert", () => {
      type PayslipInsert = Database["public"]["Tables"]["crm_payslips"]["Insert"];
      const minimal: PayslipInsert = {
        org_id: "org-1",
        payroll_run_id: "run-1",
        staff_id: "staff-1",
        month_year: "2026-10",
        salary_profile_snapshot: { base_amount: 45000 },
        working_days_in_month: 26,
      };
      expect(minimal.working_days_in_month).toBe(26);

      type MissingSnapshot = {
        org_id: string;
        payroll_run_id: string;
        staff_id: string;
        month_year: string;
        working_days_in_month: number;
      };
      type CanAssignMissingSnapshot = Extends<MissingSnapshot, PayslipInsert>;
      const canAssignMissingSnapshot: CanAssignMissingSnapshot = false;
      expect(canAssignMissingSnapshot).toBe(false);
    });

    it("validates minimal vs full payload for crm_salary_adjustments.Insert", () => {
      type AdjInsert = Database["public"]["Tables"]["crm_salary_adjustments"]["Insert"];
      const minimal: AdjInsert = {
        org_id: "org-1",
        staff_id: "staff-1",
        type: "advance",
        amount: 5000,
      };
      expect(minimal.amount).toBe(5000);

      type MissingAmount = { org_id: string; staff_id: string; type: string };
      type CanAssignMissingAmount = Extends<MissingAmount, AdjInsert>;
      const canAssignMissingAmount: CanAssignMissingAmount = false;
      expect(canAssignMissingAmount).toBe(false);
    });

    it("allows empty object {} for all Update types and validates partial updates", () => {
      type ProfileUpdate = Database["public"]["Tables"]["crm_salary_profiles"]["Update"];
      type RunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      type PayslipUpdate = Database["public"]["Tables"]["crm_payslips"]["Update"];
      type AdjUpdate = Database["public"]["Tables"]["crm_salary_adjustments"]["Update"];

      const emptyProfile: ProfileUpdate = {};
      const emptyRun: RunUpdate = {};
      const emptyPayslip: PayslipUpdate = {};
      const emptyAdj: AdjUpdate = {};

      expect(emptyProfile).toBeDefined();
      expect(emptyRun).toBeDefined();
      expect(emptyPayslip).toBeDefined();
      expect(emptyAdj).toBeDefined();

      const singleFieldUpdate: ProfileUpdate = { base_amount: 60000 };
      expect(singleFieldUpdate.base_amount).toBe(60000);
    });
  });

  describe("Suite 3: Foreign Key Relationships in Supabase Database Type", () => {
    it("defines foreign key relationships for crm_salary_profiles and crm_payroll_runs", () => {
      type ProfileRels = Database["public"]["Tables"]["crm_salary_profiles"]["Relationships"];
      type RunRels = Database["public"]["Tables"]["crm_payroll_runs"]["Relationships"];

      const profileRelsSample: ProfileRels = [
        {
          foreignKeyName: "crm_salary_profiles_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(profileRelsSample.length).toBeGreaterThanOrEqual(1);

      const runRelsSample: RunRels = [
        {
          foreignKeyName: "crm_payroll_runs_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(runRelsSample.length).toBeGreaterThanOrEqual(1);
    });

    it("defines foreign key relationships for crm_payslips and crm_salary_adjustments", () => {
      type PayslipRels = Database["public"]["Tables"]["crm_payslips"]["Relationships"];
      const payslipRelsSample: PayslipRels = [
        {
          foreignKeyName: "crm_payslips_payroll_run_id_fkey",
          columns: ["payroll_run_id"],
          isOneToOne: false,
          referencedRelation: "crm_payroll_runs",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "crm_payslips_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(payslipRelsSample.length).toBe(2);
    });
  });

  describe("Suite 4: Domain Literal Union Types & Snapshot Contracts", () => {
    it("validates SalaryType, PayrollRunStatus, PaymentStatus literal unions", () => {
      const types: SalaryType[] = ["monthly", "daily", "hourly"];
      expect(types).toHaveLength(3);

      const runStatuses: PayrollRunStatus[] = ["draft", "locked", "disbursed"];
      expect(runStatuses).toHaveLength(3);

      const payStatuses: PaymentStatus[] = ["pending", "paid", "partial"];
      expect(payStatuses).toHaveLength(3);

      type InvalidSalary = "annual" | "weekly";
      type CanAssignInvalidSalary = Extends<InvalidSalary, SalaryType>;
      const canAssignInvalidSalary: CanAssignInvalidSalary = false;
      expect(canAssignInvalidSalary).toBe(false);
    });

    it("validates AdjustmentType and AdjustmentStatus literal unions", () => {
      const adjTypes: AdjustmentType[] = ["advance", "bonus", "deduction", "loan_repayment"];
      expect(adjTypes).toHaveLength(4);

      const adjStatuses: AdjustmentStatus[] = ["pending", "approved", "deducted", "rejected"];
      expect(adjStatuses).toHaveLength(4);

      type InvalidAdjType = "reimbursement" | "perk";
      type CanAssignInvalidAdj = Extends<InvalidAdjType, AdjustmentType>;
      const canAssignInvalidAdj: CanAssignInvalidAdj = false;
      expect(canAssignInvalidAdj).toBe(false);
    });

    it("validates SalaryProfileSnapshot schema contract", () => {
      const snapshot: SalaryProfileSnapshot = {
        salary_type: "monthly",
        base_amount: 55000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 200,
        pf_deduction_percent: 12,
        esi_deduction_percent: 0.75,
      };
      expect(snapshot.base_amount).toBe(55000);
      expect(snapshot.currency).toBe("INR");
    });
  });

  describe("Suite 5: Domain Models, Computed Types & Transformation Ergonomics", () => {
    it("validates CRMSalaryProfile conforms to Row with optional enrichment", () => {
      const profile: CRMSalaryProfile = {
        id: "prof-1",
        org_id: "org-1",
        staff_id: "staff-1",
        staff_name: "Rahul Verma",
        staff_email: "rahul@credsmart.app",
        role_name: "Senior Accountant",
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 250,
        pf_deduction_percent: 12,
        esi_deduction_percent: 0.75,
        is_active: true,
        created_at: "2026-10-18T00:00:00Z",
        updated_at: "2026-10-18T00:00:00Z",
      };
      expect(profile.staff_name).toBe("Rahul Verma");
      expect(profile.base_amount).toBe(50000);
    });

    it("validates PayslipComputedData has all 16 calculated metrics", () => {
      const computed: PayslipComputedData = {
        staffId: "staff-1",
        monthYear: "2026-10",
        workingDaysInMonth: 26,
        presentDays: 24,
        absentDays: 2,
        halfDays: 0,
        lopDays: 0,
        overtimeMinutes: 120,
        grossSalary: 50000,
        lopDeduction: 0,
        overtimeAmount: 500,
        pfDeduction: 6000,
        esiDeduction: 375,
        advanceDeduction: 2000,
        bonusAmount: 1000,
        netSalary: 43125,
      };
      expect(computed.netSalary).toBe(43125);
      expect(computed.workingDaysInMonth).toBe(26);
    });

    it("validates pure mapper transforms raw Supabase row to UI model with default fallbacks", () => {
      type PayslipRow = Database["public"]["Tables"]["crm_payslips"]["Row"];

      const rawRow: PayslipRow = {
        id: "slip-1",
        org_id: "org-1",
        payroll_run_id: "run-1",
        staff_id: "staff-1",
        month_year: "2026-10",
        salary_profile_snapshot: { base_amount: 50000 },
        working_days_in_month: 26,
        present_days: 26,
        absent_days: 0,
        half_days: 0,
        lop_days: 0,
        overtime_minutes: 0,
        gross_salary: 50000,
        lop_deduction: 0,
        overtime_amount: 0,
        pf_deduction: 6000,
        esi_deduction: 0,
        advance_deduction: 0,
        bonus_amount: 0,
        net_salary: 44000,
        payment_status: "pending",
        paid_at: null,
        created_at: "2026-10-18T10:00:00Z",
        updated_at: "2026-10-18T10:00:00Z",
      };

      function mapRowToDomainPayslip(
        row: PayslipRow,
        staffName: string = "Unknown Staff"
      ): CRMPayslip {
        return {
          ...row,
          staff_name: staffName,
          payment_status: row.payment_status as PaymentStatus,
        };
      }

      const domain = mapRowToDomainPayslip(rawRow, "Priya Sharma");
      expect(domain.staff_name).toBe("Priya Sharma");
      expect(domain.payment_status).toBe("pending");
      expect(domain.paid_at).toBeNull();
    });
  });
});
```

---

## 5. Verification Method

### 5.1 Command Line Verification

To execute and independently verify the test suites once created:

1. **Verify `crmSalaryMigration.test.ts` individually**:
   ```powershell
   cmd /c npx vitest run src/test/crmSalaryMigration.test.ts
   ```
   - Invalidation condition: Exits with non-zero code or fails syntax/idempotency assertions.

2. **Verify `crmSalaryTypes.test.ts` individually**:
   ```powershell
   cmd /c npx vitest run src/test/crmSalaryTypes.test.ts
   ```
   - Invalidation condition: Exits with non-zero code or TypeScript type mismatch.

3. **Verify both Milestone 1 test suites together**:
   ```powershell
   cmd /c npx vitest run src/test/crmSalary*
   ```
   - Invalidation condition: Any failure in either test suite.

4. **Verify TypeScript type checking across the entire project**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   - Invalidation condition: Any TypeScript compiler error reported.

5. **Verify zero regression against Phase 1 & 2 CRM test suites**:
   ```powershell
   cmd /c npx vitest run src/test/crm*
   ```
   - Expected result: 100% passing across all existing and new CRM tests.

### 5.2 Files to Inspect
- `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
- `src/integrations/supabase/types.ts`
- `src/types/crmSalary.ts`
- `src/test/crmSalaryMigration.test.ts`
- `src/test/crmSalaryTypes.test.ts`
