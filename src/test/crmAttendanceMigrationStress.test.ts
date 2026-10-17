import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Milestone 1 Empirical Stress Test: Attendance SQL Migration & Types", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261017010000_create_crm_attendance_tables.sql"
  );
  const typesPath = path.resolve(
    process.cwd(),
    "src/types/crmAttendance.ts"
  );
  const supabaseTypesPath = path.resolve(
    process.cwd(),
    "src/integrations/supabase/types.ts"
  );

  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  // Helper: Extract statements cleanly
  const splitSqlStatements = (sql: string): string[] => {
    // Strip comments
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
  // TASK 1: SYNTAX VALIDATION
  // ==========================================================================
  describe("Task 1: SQL Syntax & DDL Integrity", () => {
    it("migration file exists and is non-empty", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      expect(migrationSql.length).toBeGreaterThan(500);
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
        if (char === "'" && migrationSql[i - 1] !== "\\") {
          inQuote = !inQuote;
        }
        if (!inQuote) {
          if (char === "(") openCount++;
          if (char === ")") closeCount++;
        }
      }

      expect(openCount).toBe(closeCount);
      expect(openCount).toBeGreaterThan(0);
    });

    it("validates balanced single quotes across the entire migration", () => {
      // Remove escaped quotes ''
      const unescaped = migrationSql.replace(/''/g, "");
      const singleQuotes = (unescaped.match(/'/g) || []).length;
      expect(singleQuotes % 2).toBe(0);
    });

    it("validates balanced double quotes across the entire migration", () => {
      const doubleQuotes = (migrationSql.match(/"/g) || []).length;
      expect(doubleQuotes % 2).toBe(0);
    });

    it("parses all DDL statements and confirms each statement has balanced parentheses and ends with valid structure", () => {
      const statements = splitSqlStatements(migrationSql);
      expect(statements.length).toBeGreaterThan(15);

      for (const stmt of statements) {
        if (stmt === "BEGIN" || stmt === "COMMIT") continue;

        // Verify statement starts with recognized DDL keyword
        const startsWithValidKeyword = /^(CREATE|ALTER|DROP|GRANT|REVOKE)\b/i.test(stmt);
        expect(
          startsWithValidKeyword,
          `Statement does not start with valid DDL keyword: ${stmt.slice(0, 40)}...`
        ).toBe(true);

        // Check statement-level parentheses balance
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
        expect(openP, `Unbalanced parentheses in statement: ${stmt.slice(0, 50)}...`).toBe(closeP);
      }
    });

    it("validates all required tables are declared with correct primary keys", () => {
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_geolocations\s*\(/i);
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_attendance\s*\(/i);
      expect(migrationSql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_attendance_requests\s*\(/i);

      // Verify UUID primary keys with gen_random_uuid()
      expect(migrationSql).toContain("id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY");
    });

    it("validates unique constraint on crm_attendance (org_id, staff_id, date)", () => {
      expect(migrationSql).toMatch(
        /CONSTRAINT\s+uq_crm_attendance_staff_date\s+UNIQUE\s*\(\s*org_id\s*,\s*staff_id\s*,\s*date\s*\)/i
      );
    });

    it("validates foreign key references and onDelete cascade/set null rules", () => {
      // crm_geolocations
      expect(migrationSql).toContain("org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE");

      // crm_attendance
      expect(migrationSql).toContain("staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE");
      expect(migrationSql).toContain("clock_in_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL");
      expect(migrationSql).toContain("clock_out_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL");

      // crm_attendance_requests
      expect(migrationSql).toContain("attendance_id UUID REFERENCES public.crm_attendance(id) ON DELETE CASCADE");
      expect(migrationSql).toContain("reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL");
    });
  });

  // ==========================================================================
  // TASK 2: IDEMPOTENCY SIMULATION
  // ==========================================================================
  describe("Task 2: Idempotency & Repeat-Execution Oracle", () => {
    it("ensures all CREATE TABLE statements use IF NOT EXISTS", () => {
      const createTableMatches = migrationSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.\w+/gi) || [];
      expect(createTableMatches.length).toBe(3);
      for (const match of createTableMatches) {
        expect(match.toUpperCase()).toContain("IF NOT EXISTS");
      }
    });

    it("ensures all CREATE INDEX statements use IF NOT EXISTS", () => {
      const createIndexMatches = migrationSql.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+/gi) || [];
      expect(createIndexMatches.length).toBeGreaterThanOrEqual(10);
      for (const match of createIndexMatches) {
        expect(match.toUpperCase()).toContain("IF NOT EXISTS");
      }
    });

    it("ensures all triggers are preceded by DROP TRIGGER IF EXISTS", () => {
      const createTriggerMatches = Array.from(
        migrationSql.matchAll(/CREATE\s+TRIGGER\s+(\w+)\s+BEFORE\s+UPDATE\s+ON\s+public\.(\w+)/gi)
      );
      expect(createTriggerMatches.length).toBe(2);

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

    it("ensures all policies are preceded by DROP POLICY IF EXISTS", () => {
      const createPolicyMatches = Array.from(
        migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.(\w+)/gi)
      );
      expect(createPolicyMatches.length).toBe(12);

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

    it("verifies RLS enablement is idempotent", () => {
      const rlsMatches = migrationSql.match(/ALTER\s+TABLE\s+public\.\w+\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/gi) || [];
      expect(rlsMatches.length).toBe(3);
    });

    it("simulates duplicate script execution with no unhandled collisions", () => {
      // An idempotency oracle verifies that every DDL statement either has IF NOT EXISTS
      // or DROP ... IF EXISTS before it, ensuring two consecutive runs produce identical schemas.
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
  // TASK 3: STATUS CONSTRAINTS, DEFAULTS & DOMAIN ALIGNMENT
  // ==========================================================================
  describe("Task 3: Status Constraints, Defaults, and Domain Alignment", () => {
    it("confirms default value for crm_attendance.status is 'present'", () => {
      expect(migrationSql).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'present'/i);
    });

    it("confirms default value for crm_attendance.verification_method is 'geo_verified'", () => {
      expect(migrationSql).toMatch(/verification_method\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'geo_verified'/i);
    });

    it("confirms default value for crm_attendance_requests.status is 'pending'", () => {
      expect(migrationSql).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i);
    });

    it("confirms default value for crm_attendance_requests.requested_status is 'present'", () => {
      expect(migrationSql).toMatch(/requested_status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'present'/i);
    });

    it("confirms default value for radius_meters is 150", () => {
      expect(migrationSql).toMatch(/radius_meters\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+150/i);
    });

    // ────────────────────────────────────────────────────────────────────────
    // EMPIRICAL VERIFICATION: Database CHECK constraints on status & verification_method
    // ────────────────────────────────────────────────────────────────────────
    it("validates database-level CHECK constraint on crm_attendance.status is present", () => {
      // Allowed values per spec: 'present', 'absent', 'half_day', 'on_leave'
      const hasStatusCheck = /status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(\s*'present'\s*,\s*'absent'\s*,\s*'half_day'\s*,\s*'on_leave'\s*\)\s*\)/i.test(
        migrationSql
      );

      expect(hasStatusCheck).toBe(true); // Confirms CHECK constraint is present at DB level
    });

    it("validates database-level CHECK constraint on crm_attendance.verification_method is present", () => {
      // Allowed values per spec: 'geo_verified', 'manual', 'regularized'
      const hasVerificationCheck = /verification_method\s+TEXT[^\n;]*CHECK\s*\(\s*verification_method\s+IN\s*\(\s*'geo_verified'\s*,\s*'manual'\s*,\s*'regularized'\s*\)\s*\)/i.test(
        migrationSql
      );

      expect(hasVerificationCheck).toBe(true); // Confirms CHECK constraint is present at DB level
    });

    it("validates database-level CHECK constraint on crm_attendance_requests.status is present", () => {
      // Allowed values per spec: 'pending', 'approved', 'rejected'
      const hasReqStatusCheck = /status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(\s*'pending'\s*,\s*'approved'\s*,\s*'rejected'\s*\)\s*\)/i.test(
        migrationSql
      );

      expect(hasReqStatusCheck).toBe(true); // Confirms CHECK constraint is present at DB level
    });

    it("validates database-level CHECK constraint on crm_attendance_requests.requested_status is present", () => {
      // Allowed values per spec: 'present', 'absent', 'half_day', 'on_leave'
      const hasReqRequestedStatusCheck = /requested_status\s+TEXT[^\n;]*CHECK\s*\(\s*requested_status\s+IN\s*\(\s*'present'\s*,\s*'absent'\s*,\s*'half_day'\s*,\s*'on_leave'\s*\)\s*\)/i.test(
        migrationSql
      );

      expect(hasReqRequestedStatusCheck).toBe(true); // Confirms CHECK constraint is present at DB level
    });

    it("validates NOT NULL constraints on work_duration_minutes and overtime_minutes", () => {
      expect(migrationSql).toMatch(/work_duration_minutes\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
      expect(migrationSql).toMatch(/overtime_minutes\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
    });
  });

  // ==========================================================================
  // TASK 4: TYPESCRIPT TYPES SYNCHRONIZATION & NULLABILITY
  // ==========================================================================
  describe("Task 4: TypeScript Types Synchronization & Strictness", () => {
    it("verifies src/types/crmAttendance.ts exports strict union types matching spec", () => {
      const typesContent = fs.readFileSync(typesPath, "utf-8");

      expect(typesContent).toContain(
        'export type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave";'
      );
      expect(typesContent).toContain(
        'export type AttendanceVerificationMethod = "geo_verified" | "manual" | "regularized";'
      );
      expect(typesContent).toContain(
        'export type AttendanceRequestStatus = "pending" | "approved" | "rejected";'
      );
    });

    it("verifies src/integrations/supabase/types.ts includes all 3 CRM attendance tables", () => {
      const supabaseTypesContent = fs.readFileSync(supabaseTypesPath, "utf-8");

      expect(supabaseTypesContent).toContain("crm_attendance: {");
      expect(supabaseTypesContent).toContain("crm_attendance_requests: {");
      expect(supabaseTypesContent).toContain("crm_geolocations: {");

      // Check relationships
      expect(supabaseTypesContent).toContain('foreignKeyName: "crm_attendance_clock_in_location_id_fkey"');
      expect(supabaseTypesContent).toContain('foreignKeyName: "crm_attendance_clock_out_location_id_fkey"');
      expect(supabaseTypesContent).toContain('foreignKeyName: "crm_attendance_requests_attendance_id_fkey"');
    });

    it("verifies nullability alignment between domain types, SQL schema, and Supabase types", () => {
      // In crm_attendance SQL:
      // work_duration_minutes INTEGER NOT NULL DEFAULT 0
      // overtime_minutes INTEGER NOT NULL DEFAULT 0
      // In Supabase types: work_duration_minutes: number, overtime_minutes: number
      // In Domain types: work_duration_minutes: number, overtime_minutes: number
      const supabaseTypesContent = fs.readFileSync(supabaseTypesPath, "utf-8");
      const domainTypesContent = fs.readFileSync(typesPath, "utf-8");

      expect(supabaseTypesContent).toContain("work_duration_minutes: number");
      expect(supabaseTypesContent).toContain("overtime_minutes: number");
      expect(domainTypesContent).toContain("work_duration_minutes: number;");
      expect(domainTypesContent).toContain("overtime_minutes: number;");
    });
  });

  // ==========================================================================
  // TASK 5: SECURITY & RLS POLICIES AUDIT
  // ==========================================================================
  describe("Task 5: Security & RLS Policy Analysis", () => {
    it("verifies every table has RLS enabled", () => {
      expect(migrationSql).toContain("ALTER TABLE public.crm_geolocations ENABLE ROW LEVEL SECURITY;");
      expect(migrationSql).toContain("ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;");
      expect(migrationSql).toContain("ALTER TABLE public.crm_attendance_requests ENABLE ROW LEVEL SECURITY;");
    });

    it("verifies all CRUD operations are covered by RLS policies", () => {
      const tables = ["crm_geolocations", "crm_attendance", "crm_attendance_requests"];
      const operations = ["SELECT", "INSERT", "UPDATE", "DELETE"];

      for (const table of tables) {
        for (const op of operations) {
          const regex = new RegExp(`CREATE\\s+POLICY[\\s\\S]*?ON\\s+public\\.${table}\\s+FOR\\s+${op}`, "i");
          expect(regex.test(migrationSql), `Missing ${op} policy on ${table}`).toBe(true);
        }
      }
    });

    it("verifies all policies enforce authenticated role and has_org_access", () => {
      const policyDefinitions = Array.from(
        migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"[\s\S]*?;/gi)
      );
      expect(policyDefinitions.length).toBe(12);

      for (const policy of policyDefinitions) {
        const text = policy[0];
        expect(text).toContain("auth.role() = 'authenticated'");
        expect(text).toContain("has_org_access(org_id)");
      }
    });
  });
});
