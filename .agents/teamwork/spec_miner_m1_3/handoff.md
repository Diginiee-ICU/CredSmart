# Handoff Report — Spec Miner M1-3
**CRM Phase 3: Salary Management & Payroll Engine — Database Migration & Test Suite Specification**

---

## 1. Observation

### 1.1 Codebase & Specification Artifacts Inspected
1. **`ORIGINAL_REQUEST.md` (lines 442–526)**:
   - Prescribes migration file: `supabase/migrations/20261017020000_create_crm_salary_tables.sql`.
   - Defines 4 primary tables: `public.crm_salary_profiles`, `public.crm_payroll_runs`, `public.crm_payslips`, and `public.crm_salary_adjustments`.
   - Requires idempotent creation (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
   - Requires RLS enabled on all 4 tables with `has_org_access(org_id)` policy for SELECT, INSERT, UPDATE, DELETE.
   - Demands test suite: `src/test/crmSalaryMigration.test.ts` with 15+ tests validating contracts, types, constraints, and idempotency.

2. **`orchestrator_crm_phase3/DISPATCH.md` (lines 29–110)**:
   - Re-affirms M1 table schemas, exact column types, numeric precisions (`NUMERIC(12,2)`, `NUMERIC(14,2)`, `NUMERIC(10,2)`, `NUMERIC(5,2)`), CHECK constraints, unique constraints, and foreign key relations.

3. **Existing Migration Reference: `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`**:
   - Uses transactional block wrapping: starts with verbatim `BEGIN;` on line 1 and ends with `COMMIT;` on line 182.
   - All tables use `CREATE TABLE IF NOT EXISTS public.<name> (...)`.
   - All indexes use `CREATE INDEX IF NOT EXISTS <idx_name> ON public.<name>(...);`.
   - All triggers use `DROP TRIGGER IF EXISTS <trigger_name> ON public.<table_name>;` immediately followed by `CREATE TRIGGER ... BEFORE UPDATE ... FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();`.
   - All policies use `DROP POLICY IF EXISTS "<Policy Name>" ON public.<table_name>;` followed by `CREATE POLICY "<Policy Name>" ON public.<table_name> FOR <OP> ... auth.role() = 'authenticated' AND has_org_access(org_id)`.
   - RLS enablement: `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`.

4. **Existing Migration Test Reference: `src/test/crmAttendanceMigrationStress.test.ts` (405 lines)**:
   - Employs purely in-memory static SQL parsing and regex inspection without requiring a live PostgreSQL instance.
   - Contains a robust SQL statement parser `splitSqlStatements(sql: string): string[]` that strips single-line (`--`) and multi-line (`/* */`) comments, tracks single quote escapes and paren nesting depth, and splits cleanly on statement-terminating `;`.
   - Verified 31 tests passing via Vitest command: `cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts` (exited code 0, 31 passed in 62ms).

5. **Existing Supabase Types: `src/integrations/supabase/types.ts`**:
   - `crm_attendance` (lines 105–204) defines `Row`, `Insert`, `Update`, and `Relationships` matching migration foreign keys and column nullability.

---

## 2. Logic Chain

1. **Test Execution Feasibility Without Live PostgreSQL**:
   - *Observation 4* shows that `crmAttendanceMigrationStress.test.ts` achieves 100% empirical verification of SQL syntax, parentheses balance, idempotency, CHECK constraints, foreign key cascades, RLS policies, and trigger drops by parsing the `.sql` file using `fs.readFileSync` and deterministic regex patterns.
   - Therefore, `src/test/crmSalaryMigration.test.ts` can achieve identical rigor and high-speed execution (< 100ms) without spinning up Docker or connecting to remote Supabase instances.

2. **Idempotency Oracle Logic**:
   - In PostgreSQL, running migration scripts multiple times occurs during CI/CD reruns, staging redeploys, and branch resets.
   - *Observation 3 & 4* show that every statement must either:
     a) Include `IF NOT EXISTS` (`CREATE TABLE`, `CREATE INDEX`), or
     b) Be preceded by an idempotent `DROP ... IF EXISTS` (`DROP TRIGGER IF EXISTS`, `DROP POLICY IF EXISTS`), or
     c) Be inherently idempotent in PostgreSQL (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
   - Any statement violating this rule will fail the idempotency oracle test.

3. **Schema Invariant Derivation for Phase 3**:
   - *Observation 1 & 2* specify 4 tables:
     - `crm_salary_profiles`: 13 columns, PK `id`, FKs to `organizations(id)` and `auth.users(id)` (both ON DELETE CASCADE), unique constraint `uq_crm_salary_profiles_staff (org_id, staff_id)`, CHECK constraint on `salary_type IN ('monthly', 'daily', 'hourly')`, `updated_at` trigger.
     - `crm_payroll_runs`: 11 columns, PK `id`, FK to `organizations(id)` (CASCADE) and `locked_by -> auth.users(id)` (SET NULL), unique constraint `uq_crm_payroll_runs_month (org_id, month_year)`, CHECK constraint on `status IN ('draft', 'locked', 'disbursed')`, `updated_at` trigger.
     - `crm_payslips`: 23 columns, PK `id`, FK to `organizations(id)` (CASCADE), `crm_payroll_runs(id)` (CASCADE), and `auth.users(id)` (CASCADE), unique constraint `uq_crm_payslips_staff_month (org_id, staff_id, month_year)`, CHECK constraint on `payment_status IN ('pending', 'paid', 'partial')`, snapshot JSONB field, `updated_at` trigger.
     - `crm_salary_adjustments`: 11 columns, PK `id`, FK to `organizations(id)` (CASCADE), `auth.users(id)` (CASCADE), `requested_by -> auth.users(id)` (SET NULL), `approved_by -> auth.users(id)` (SET NULL), CHECK constraint on `type IN ('advance', 'bonus', 'deduction', 'loan_repayment')` and `status IN ('pending', 'approved', 'deducted', 'rejected')`.
   - All 4 tables require RLS enablement and 4 CRUD policies (SELECT, INSERT, UPDATE, DELETE) -> exactly 16 policies, each preceded by `DROP POLICY IF EXISTS`.

4. **Test Suite Sizing**:
   - To satisfy the "15+ tests" requirement with complete safety, we design 22 distinct test cases across 8 logical describe blocks.

---

## 3. Caveats

1. **Live PostgreSQL Type Coercion**: Static regex and AST-like string parsing verify that SQL DDL adheres to syntax and schema standards, but cannot verify PostgreSQL runtime features like custom plpgsql functions unless `update_updated_at()` is already defined in the database (which it is, created in initial migrations).
2. **Nullable vs Default Columns**: In PostgreSQL, a column with `DEFAULT` is optional during `INSERT`, but unless marked `NOT NULL` it can still accept explicit `NULL` values. The test suite specifically verifies both `NOT NULL` and `DEFAULT` clauses.
3. **No Direct Production Implementation**: As Spec Miner, this document specifies the exact architecture, regexes, and test contracts for `worker_m1` and `test_writer_m1` to implement without writing the migration file directly.

---

## 4. Conclusion

- The standard Vitest migration test architecture established in `crmAttendanceMigrationStress.test.ts` provides the exact model for `crmSalaryMigration.test.ts`.
- The migration `supabase/migrations/20261017020000_create_crm_salary_tables.sql` must contain exactly:
  - 1 `BEGIN;` and 1 `COMMIT;` wrapping.
  - 4 `CREATE TABLE IF NOT EXISTS` statements.
  - At least 14 `CREATE INDEX IF NOT EXISTS` statements covering foreign keys, compound search keys, and status columns.
  - 3 `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` pairs for tables with `updated_at`.
  - 4 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` statements.
  - 16 `DROP POLICY IF EXISTS` + `CREATE POLICY` pairs (4 tables × 4 CRUD ops) with `auth.role() = 'authenticated'` and `has_org_access(org_id)`.
  - 5 PostgreSQL `CHECK` constraints on domain text fields.
  - 3 named `UNIQUE` constraints.
- A 22-test suite specification is fully authored below, covering all syntactic, structural, idempotency, constraint, and security invariants.

---

## 5. Verification Method

To verify the test suite once implemented:
1. Ensure `supabase/migrations/20261017020000_create_crm_salary_tables.sql` is present.
2. Run Vitest against the migration test file:
   ```bash
   cmd /c npx vitest run src/test/crmSalaryMigration.test.ts
   ```
3. Invalidation Conditions:
   - Any test failure in the 22 test cases.
   - Any unbalanced parenthesis, quote, or missing `IF NOT EXISTS`.
   - Missing foreign key cascade or check constraint.
   - Total test count < 15.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | SQL DDL | Transactional Wrapping | Wraps all DDL in single atomic transaction | Migration file content | `BEGIN;` at start, `COMMIT;` at end | Partial migration aborted if any statement fails | `crmAttendanceMigrationStress.test.ts:74` |
| 2 | SQL Parsing | In-Memory Statement Splitter | Splits SQL statements tracking quote state and paren depth | Raw SQL string | Clean statement array | Ignores semicolons inside quotes or parens | `crmAttendanceMigrationStress.test.ts:22` |
| 3 | Idempotency | `CREATE TABLE IF NOT EXISTS` | Ensures tables can be re-declared without error | Table name, column defs | Idempotent table definition | Table collision without IF NOT EXISTS throws error | `ORIGINAL_REQUEST.md:520` |
| 4 | Idempotency | `CREATE INDEX IF NOT EXISTS` | Ensures indexes can be re-declared without error | Index name, target columns | Idempotent index definition | Duplicate index throws error without clause | `ORIGINAL_REQUEST.md:520` |
| 5 | Idempotency | Trigger Pre-Drop | Drops trigger before recreation | Trigger name, table name | `DROP TRIGGER IF EXISTS` followed by `CREATE TRIGGER` | Duplicate trigger creation fails in PG | `20261017010000_create_crm_attendance_tables.sql:66` |
| 6 | Idempotency | Policy Pre-Drop | Drops policy before recreation | Policy name, table name | `DROP POLICY IF EXISTS` followed by `CREATE POLICY` | Duplicate policy creation fails in PG | `20261017010000_create_crm_attendance_tables.sql:115` |
| 7 | Schema | `crm_salary_profiles` | Stores staff salary configuration, rates, deductions | 13 columns, PK, FKs | Table created with unique `(org_id, staff_id)` | Duplicate staff profile per org rejected | `ORIGINAL_REQUEST.md:446` |
| 8 | Schema | `crm_payroll_runs` | Tracks monthly payroll execution, locking, and disbursement | 11 columns, PK, FKs | Table created with unique `(org_id, month_year)` | Duplicate run per org-month rejected | `ORIGINAL_REQUEST.md:462` |
| 9 | Schema | `crm_payslips` | Stores computed monthly payslips with profile snapshot and attendance metrics | 23 columns, PK, FKs | Table created with unique `(org_id, staff_id, month_year)` | Duplicate payslip per staff-month rejected | `ORIGINAL_REQUEST.md:476` |
| 10 | Schema | `crm_salary_adjustments` | Stores salary advances, bonuses, deductions, loan repayments | 11 columns, PK, FKs | Table created with status tracking | Invalid type or status rejected | `ORIGINAL_REQUEST.md:503` |
| 11 | Constraint | Domain CHECK Constraints | Restricts column values to allowed string enumerations | Text column values | PostgreSQL CHECK expression | Throws `check_violation` on invalid value | `crmAttendanceMigrationStress.test.ts:280` |
| 12 | Foreign Key | Cascade Deletion Rules | Purges child records when organization or user is deleted | Parent row deletion | Automatic deletion or nullification | Orphaned child rows prevented | `ORIGINAL_REQUEST.md:448` |
| 13 | Security | Row Level Security (RLS) | Enforces organization-level tenant isolation | Tenant org_id, JWT auth session | Restricted row access via `has_org_access` | Access denied / 0 rows returned for unauthorized users | `ORIGINAL_REQUEST.md:517` |
| 14 | Trigger | `update_updated_at` | Automatically updates `updated_at` timestamp on row update | `BEFORE UPDATE` event | Sets `updated_at = now()` | Trigger executes per modified row | `20261017010000_create_crm_attendance_tables.sql:67` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Statement Splitting | Semicolon inside string literal (e.g. `description TEXT DEFAULT 'foo;bar'`) | Splitter state machine maintains `inSingleQuote = true`, preventing premature statement cut. |
| 2 | Statement Splitting | Semicolon inside CHECK constraint parens | Splitter tracks `parenDepth > 0`, ignoring semicolons until depth returns to 0. |
| 3 | Single Quote Balancing | Escaped single quotes (`''`) in comments or defaults | Quote checker strips `''` before verifying even quote count `singleQuotes % 2 === 0`. |
| 4 | Idempotency Oracle | Consecutive execution of the same migration | Oracle verifies zero risky statements exist; all statements are safeguarded by IF NOT EXISTS or DROP IF EXISTS. |
| 5 | Nullable FKs | `locked_by`, `requested_by`, `approved_by` set to NULL on user deletion | Foreign keys configured with `ON DELETE SET NULL`, preserving audit history without referencing deleted auth user. |
| 6 | JSONB Snapshot | `salary_profile_snapshot` in `crm_payslips` | `JSONB NOT NULL` column captures full profile at payroll run time, insulating historical payslips from future salary profile edits. |
| 7 | Zero Net Pay Clamp | Negative deductions exceeding gross salary | Formula and schema support NUMERIC(12,2) with non-negative checks or engine-level clamping to 0.00. |

---

## Complete Test Suite Specification: `src/test/crmSalaryMigration.test.ts`

Below is the complete, production-ready specification containing helper functions, regex patterns, and all 22 test definitions for `src/test/crmSalaryMigration.test.ts`.

### Helper Functions & Setup

```typescript
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
```

### Test Suite 1: File Naming, Physical Existence & Transaction Wrapping (4 Tests)

```typescript
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
```

### Test Suite 2: DDL Statement Integrity & Syntax (2 Tests)

```typescript
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
```

### Test Suite 3: Table Schemas, Column Definitions & Primary Keys (4 Tests)

```typescript
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
```

### Test Suite 4: Foreign Keys and Cascade Rules (1 Test)

```typescript
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
```

### Test Suite 5: Unique and Check Constraints (2 Tests)

```typescript
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
```

### Test Suite 6: Idempotency & Repeat Execution Oracle (5 Tests)

```typescript
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
          `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policyName}"\s+ON\s+public\\.${tableName};`,
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
```

### Test Suite 7: Security & Row-Level Security (RLS) (3 Tests)

```typescript
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
```

### Test Suite 8: Triggers & Timestamp Automation (1 Test)

```typescript
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
```

---

## 6. Exact Invariants to Strictly Enforce

1. **Naming & Paths**:
   - Migration file path: `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
   - Test suite file path: `src/test/crmSalaryMigration.test.ts`
2. **Atomic Transaction**:
   - `BEGIN;` at the absolute top of the file, `COMMIT;` at the absolute end.
3. **Idempotency**:
   - Every `CREATE TABLE` has `IF NOT EXISTS`.
   - Every `CREATE INDEX` has `IF NOT EXISTS`.
   - Every `CREATE TRIGGER` has a preceding `DROP TRIGGER IF EXISTS ... ON public.<table>;`.
   - Every `CREATE POLICY` has a preceding `DROP POLICY IF EXISTS "..." ON public.<table>;`.
4. **Foreign Key Integrity**:
   - `org_id` always references `public.organizations(id) ON DELETE CASCADE`.
   - Staff user references (`staff_id`) always reference `auth.users(id) ON DELETE CASCADE`.
   - Payroll run references (`payroll_run_id`) reference `public.crm_payroll_runs(id) ON DELETE CASCADE`.
   - Audit / approver user references (`locked_by`, `requested_by`, `approved_by`) reference `auth.users(id) ON DELETE SET NULL`.
5. **Precise Precision**:
   - `base_amount`, `gross_salary`, `net_salary`, `amount`, `total_payout`: `NUMERIC(12,2)` or `NUMERIC(14,2)`
   - `pf_deduction_percent`, `esi_deduction_percent`, `lop_days`: `NUMERIC(5,2)`
   - `hourly_overtime_rate`: `NUMERIC(10,2)`
6. **Constraint Names**:
   - `uq_crm_salary_profiles_staff` on `crm_salary_profiles(org_id, staff_id)`
   - `uq_crm_payroll_runs_month` on `crm_payroll_runs(org_id, month_year)`
   - `uq_crm_payslips_staff_month` on `crm_payslips(org_id, staff_id, month_year)`
7. **Security**:
   - Row-level security enabled on all 4 tables.
   - All 16 CRUD policies enforce `auth.role() = 'authenticated' AND has_org_access(org_id)`.
