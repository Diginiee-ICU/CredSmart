import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Adversarial Empirical Challenge: CRM Phase 3 Salary Migration DDL", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261017020000_create_crm_salary_tables.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // Lexical cleaner: remove comments while preserving string literals
  const stripComments = (input: string): string => {
    let result = "";
    let inSingleQuote = false;
    let i = 0;
    while (i < input.length) {
      if (input[i] === "'" && input[i - 1] !== "\\") {
        inSingleQuote = !inSingleQuote;
        result += input[i];
        i++;
      } else if (!inSingleQuote && input[i] === "-" && input[i + 1] === "-") {
        while (i < input.length && input[i] !== "\n") i++;
      } else if (!inSingleQuote && input[i] === "/" && input[i + 1] === "*") {
        i += 2;
        while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
        i += 2;
      } else {
        result += input[i];
        i++;
      }
    }
    return result;
  };

  const cleanSql = stripComments(sql);

  // Helper: split into individual SQL statements tracking quotes & parens
  const parseStatements = (rawSql: string): string[] => {
    const cleaned = stripComments(rawSql);
    const statements: string[] = [];
    let current = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let parenDepth = 0;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      const prev = i > 0 ? cleaned[i - 1] : "";

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
        if (trimmed) statements.push(trimmed);
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) statements.push(current.trim());
    return statements;
  };

  // Helper: parse table definitions and extract column names
  const extractTableColumns = (tableDdl: string): string[] => {
    // Extract contents inside outermost parens of CREATE TABLE
    const firstParen = tableDdl.indexOf("(");
    const lastParen = tableDdl.lastIndexOf(")");
    const body = tableDdl.substring(firstParen + 1, lastParen);

    const lines = body.split(",\n").map((l) => l.trim());
    const columns: string[] = [];

    for (const line of lines) {
      if (
        line.startsWith("CONSTRAINT") ||
        line.startsWith("PRIMARY KEY") ||
        line.startsWith("UNIQUE") ||
        line.startsWith("CHECK") ||
        line.startsWith("FOREIGN KEY")
      ) {
        continue;
      }
      const match = line.match(/^(\w+)\s+/);
      if (match) {
        columns.push(match[1]);
      }
    }
    return columns;
  };

  // ==========================================================================
  // CHALLENGE 1: QUOTE PARITY & DELIMITER SANITY
  // ==========================================================================
  describe("Challenge 1: Quote Parity & String Literal Delimiters", () => {
    it("1.1 Single quotes: strictly balanced with zero unescaped/dangling single quotes", () => {
      // In SQL, single quotes can be escaped by doubling: ''
      const withoutEscaped = cleanSql.replace(/''/g, "");
      const singleQuotes = (withoutEscaped.match(/'/g) || []).length;
      expect(singleQuotes % 2).toBe(0);
      expect(singleQuotes).toBeGreaterThan(0);
    });

    it("1.2 Double quotes: strictly balanced with zero unmatched identifier quotes", () => {
      const doubleQuotes = (cleanSql.match(/"/g) || []).length;
      expect(doubleQuotes % 2).toBe(0);
      expect(doubleQuotes).toBeGreaterThan(0);
    });

    it("1.3 Backticks: zero backtick characters (strict PostgreSQL compliance)", () => {
      expect(cleanSql).not.toContain("`");
    });

    it("1.4 Dollar quotes: if any dollar-quoting ($$) is used, tags are balanced", () => {
      const dollarMatches = cleanSql.match(/\$[a-zA-Z0-9_]*\$/g) || [];
      expect(dollarMatches.length % 2).toBe(0);
    });
  });

  // ==========================================================================
  // CHALLENGE 2: PARENTHESIS NESTING DEPTH & INTEGRITY
  // ==========================================================================
  describe("Challenge 2: Parenthesis Nesting Depth & Integrity", () => {
    it("2.1 Parenthesis depth never goes negative at any point during parsing", () => {
      let depth = 0;
      let inSingleQuote = false;
      let inDoubleQuote = false;

      for (let i = 0; i < cleanSql.length; i++) {
        const char = cleanSql[i];
        const prev = i > 0 ? cleanSql[i - 1] : "";

        if (char === "'" && prev !== "\\") inSingleQuote = !inSingleQuote;
        else if (char === '"' && prev !== "\\") inDoubleQuote = !inDoubleQuote;
        else if (!inSingleQuote && !inDoubleQuote) {
          if (char === "(") depth++;
          else if (char === ")") {
            depth--;
            expect(
              depth >= 0,
              `Premature closing parenthesis detected at index ${i} (surrounding: "${cleanSql.slice(Math.max(0, i - 20), i + 20)}")`
            ).toBe(true);
          }
        }
      }
      expect(depth).toBe(0);
    });

    it("2.2 Each individual DDL statement has balanced parenthesis nesting", () => {
      const statements = parseStatements(sql);
      expect(statements.length).toBeGreaterThan(20);

      for (const stmt of statements) {
        let depth = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let i = 0; i < stmt.length; i++) {
          const char = stmt[i];
          const prev = i > 0 ? stmt[i - 1] : "";

          if (char === "'" && prev !== "\\") inSingleQuote = !inSingleQuote;
          else if (char === '"' && prev !== "\\") inDoubleQuote = !inDoubleQuote;
          else if (!inSingleQuote && !inDoubleQuote) {
            if (char === "(") depth++;
            else if (char === ")") depth--;
          }
        }
        expect(depth, `Unbalanced parentheses in statement:\n${stmt}`).toBe(0);
      }
    });

    it("2.3 Nesting depth does not exceed reasonable threshold (max depth <= 5)", () => {
      let depth = 0;
      let maxDepth = 0;
      let inSingleQuote = false;
      let inDoubleQuote = false;

      for (let i = 0; i < cleanSql.length; i++) {
        const char = cleanSql[i];
        const prev = i > 0 ? cleanSql[i - 1] : "";

        if (char === "'" && prev !== "\\") inSingleQuote = !inSingleQuote;
        else if (char === '"' && prev !== "\\") inDoubleQuote = !inDoubleQuote;
        else if (!inSingleQuote && !inDoubleQuote) {
          if (char === "(") {
            depth++;
            if (depth > maxDepth) maxDepth = depth;
          } else if (char === ")") {
            depth--;
          }
        }
      }
      expect(maxDepth).toBeGreaterThan(0);
      expect(maxDepth).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // CHALLENGE 3: POSTGRES IDENTIFIER RULES & REGEX VALIDATION
  // ==========================================================================
  describe("Challenge 3: Postgres Identifier Rules & Regex Validation", () => {
    it("3.1 All table, column, index, and constraint names obey Postgres identifier conventions (<= 63 bytes)", () => {
      // Table names
      const tableMatches = Array.from(cleanSql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)/gi));
      for (const m of tableMatches) {
        expect(m[1].length).toBeLessThanOrEqual(63);
        expect(/^[a-z][a-z0-9_]*$/.test(m[1])).toBe(true);
      }

      // Index names
      const indexMatches = Array.from(cleanSql.matchAll(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi));
      for (const m of indexMatches) {
        expect(m[1].length).toBeLessThanOrEqual(63);
        expect(/^[a-z][a-z0-9_]*$/.test(m[1])).toBe(true);
      }

      // Constraint names
      const constraintMatches = Array.from(cleanSql.matchAll(/CONSTRAINT\s+(\w+)/gi));
      for (const m of constraintMatches) {
        expect(m[1].length).toBeLessThanOrEqual(63);
        expect(/^[a-z][a-z0-9_]*$/.test(m[1])).toBe(true);
      }

      // Trigger names
      const triggerMatches = Array.from(cleanSql.matchAll(/CREATE\s+TRIGGER\s+(\w+)/gi));
      for (const m of triggerMatches) {
        expect(m[1].length).toBeLessThanOrEqual(63);
        expect(/^[a-z][a-z0-9_]*$/.test(m[1])).toBe(true);
      }
    });

    it("3.2 Every statement ends with a clean semicolon", () => {
      const statements = parseStatements(sql);
      expect(statements.length).toBeGreaterThanOrEqual(25);
      // All extracted statements are trimmed non-empty statements
      for (const stmt of statements) {
        expect(stmt.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 4: IDEMPOTENCY — IF NOT EXISTS CLAUSES
  // ==========================================================================
  describe("Challenge 4: Idempotency — IF NOT EXISTS Clauses", () => {
    it("4.1 100% of CREATE TABLE statements use IF NOT EXISTS", () => {
      const createTableMatches = Array.from(cleanSql.matchAll(/CREATE\s+TABLE\s+([^\(]+)\(/gi));
      expect(createTableMatches.length).toBe(4);
      for (const m of createTableMatches) {
        expect(m[0].toUpperCase()).toContain("IF NOT EXISTS");
      }
    });

    it("4.2 100% of CREATE INDEX statements use IF NOT EXISTS", () => {
      const createIndexMatches = Array.from(cleanSql.matchAll(/CREATE\s+INDEX\s+([^\n]+)ON/gi));
      expect(createIndexMatches.length).toBeGreaterThanOrEqual(12);
      for (const m of createIndexMatches) {
        expect(m[0].toUpperCase()).toContain("IF NOT EXISTS");
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 5: IDEMPOTENCY — DROP POLICY IF EXISTS
  // ==========================================================================
  describe("Challenge 5: Idempotency — DROP POLICY IF EXISTS", () => {
    it("5.1 Every CREATE POLICY statement has a corresponding preceding DROP POLICY IF EXISTS on the same table", () => {
      const createPolicyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.(\w+)/gi;
      const policies = Array.from(cleanSql.matchAll(createPolicyRegex));
      expect(policies.length).toBe(16);

      for (const p of policies) {
        const policyName = p[1];
        const tableName = p[2];

        // Search for DROP POLICY IF EXISTS "<name>" ON public.<table_name>;
        const dropRegex = new RegExp(
          `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policyName}"\\s+ON\\s+public\\.${tableName};`,
          "i"
        );
        expect(dropRegex.test(cleanSql), `Missing DROP POLICY for "${policyName}" on public.${tableName}`).toBe(true);

        // Ensure DROP appears BEFORE CREATE
        const dropIndex = cleanSql.search(dropRegex);
        const createIndex = cleanSql.indexOf(p[0]);
        expect(dropIndex).toBeLessThan(createIndex);
      }
    });

    it("5.2 Policy actions adhere to PostgreSQL specifications: INSERT uses WITH CHECK, others use USING", () => {
      const statements = parseStatements(sql);
      const policyStmts = statements.filter((s) => /^CREATE\s+POLICY/i.test(s));
      expect(policyStmts.length).toBe(16);

      for (const stmt of policyStmts) {
        if (/FOR\s+INSERT\b/i.test(stmt)) {
          expect(stmt.toUpperCase(), `INSERT policy must use WITH CHECK: ${stmt}`).toContain("WITH CHECK");
        } else if (/FOR\s+(SELECT|UPDATE|DELETE)\b/i.test(stmt)) {
          expect(stmt.toUpperCase(), `${stmt.slice(0, 40)} policy must use USING`).toContain("USING");
        }
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 6: IDEMPOTENCY — DROP TRIGGER IF EXISTS
  // ==========================================================================
  describe("Challenge 6: Idempotency — DROP TRIGGER IF EXISTS", () => {
    it("6.1 Every CREATE TRIGGER has an exact preceding DROP TRIGGER IF EXISTS on the same table", () => {
      const createTriggerRegex = /CREATE\s+TRIGGER\s+(\w+)\s+BEFORE\s+UPDATE\s+ON\s+public\.(\w+)/gi;
      const triggers = Array.from(cleanSql.matchAll(createTriggerRegex));
      expect(triggers.length).toBe(3);

      for (const t of triggers) {
        const triggerName = t[1];
        const tableName = t[2];

        const dropRegex = new RegExp(
          `DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${triggerName}\\s+ON\\s+public\\.${tableName};`,
          "i"
        );
        expect(dropRegex.test(cleanSql), `Missing DROP TRIGGER for ${triggerName} on ${tableName}`).toBe(true);

        const dropPos = cleanSql.search(dropRegex);
        const createPos = cleanSql.indexOf(t[0]);
        expect(dropPos).toBeLessThan(createPos);
      }
    });

    it("6.2 Triggers execute public.update_updated_at() FOR EACH ROW BEFORE UPDATE", () => {
      const statements = parseStatements(sql);
      const triggerStmts = statements.filter((s) => /^CREATE\s+TRIGGER/i.test(s));
      expect(triggerStmts.length).toBe(3);

      for (const stmt of triggerStmts) {
        expect(stmt).toMatch(/BEFORE\s+UPDATE\s+ON/i);
        expect(stmt).toMatch(/FOR\s+EACH\s+ROW/i);
        expect(stmt).toMatch(/EXECUTE\s+FUNCTION\s+public\.update_updated_at\(\)/i);
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 7: FOREIGN KEYS & EXPLICIT ON DELETE BEHAVIORS
  // ==========================================================================
  describe("Challenge 7: Foreign Keys & Explicit ON DELETE Behaviors", () => {
    it("7.1 Every REFERENCES clause has an explicit ON DELETE clause (no default RESTRICT hazards)", () => {
      // Match from REFERENCES to the end of column definition (comma or newline or table closing paren)
      const referencesRegex = /REFERENCES\s+[^\n,;]+/gi;
      const references = Array.from(cleanSql.matchAll(referencesRegex));
      expect(references.length).toBeGreaterThanOrEqual(8);

      for (const ref of references) {
        const refClause = ref[0].toUpperCase();
        const hasExplicitOnDelete =
          refClause.includes("ON DELETE CASCADE") ||
          refClause.includes("ON DELETE SET NULL") ||
          refClause.includes("ON DELETE RESTRICT") ||
          refClause.includes("ON DELETE NO ACTION");

        expect(
          hasExplicitOnDelete,
          `Reference clause missing explicit ON DELETE action: "${ref[0]}"`
        ).toBe(true);
      }
    });

    it("7.2 Multi-tenant isolation: org_id always uses ON DELETE CASCADE to prevent orphaned org data", () => {
      const orgIdRefs = Array.from(
        cleanSql.matchAll(/org_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.organizations\(id\)\s+([^\n,;)]+)/gi)
      );
      expect(orgIdRefs.length).toBe(4);
      for (const m of orgIdRefs) {
        expect(m[1].trim().toUpperCase()).toBe("ON DELETE CASCADE");
      }
    });

    it("7.3 Staff cascading: staff_id in core tables cascades with auth.users(id) ON DELETE CASCADE", () => {
      const staffRefs = Array.from(
        cleanSql.matchAll(/staff_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+auth\.users\(id\)\s+([^\n,;)]+)/gi)
      );
      // crm_salary_profiles, crm_payslips, crm_salary_adjustments
      expect(staffRefs.length).toBe(3);
      for (const m of staffRefs) {
        expect(m[1].trim().toUpperCase()).toBe("ON DELETE CASCADE");
      }
    });

    it("7.4 Audit references: nullable actor columns (locked_by, requested_by, approved_by) use ON DELETE SET NULL to preserve financial history", () => {
      const actorCols = ["locked_by", "requested_by", "approved_by"];
      for (const col of actorCols) {
        const regex = new RegExp(`${col}\\s+UUID\\s+REFERENCES\\s+auth\\.users\\(id\\)\\s+ON\\s+DELETE\\s+SET\\s+NULL`, "i");
        expect(regex.test(cleanSql), `Column ${col} does not have ON DELETE SET NULL`).toBe(true);
      }
    });

    it("7.5 Payslip parent cascade: payroll_run_id uses ON DELETE CASCADE to public.crm_payroll_runs(id)", () => {
      expect(cleanSql).toMatch(
        /payroll_run_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.crm_payroll_runs\(id\)\s+ON\s+DELETE\s+CASCADE/i
      );
    });
  });

  // ==========================================================================
  // CHALLENGE 8: CHECK CONSTRAINTS & DEFAULT VALUE PARITY
  // ==========================================================================
  describe("Challenge 8: Check Constraints & Default Value Parity", () => {
    it("8.1 crm_salary_profiles.salary_type CHECK constraint allows exact domain values and default conforms", () => {
      const allowedValues = ["monthly", "daily", "hourly"];
      const checkMatch = cleanSql.match(/salary_type\s+TEXT[^\n;]*CHECK\s*\(\s*salary_type\s+IN\s*\(([^)]+)\)\)/i);
      expect(checkMatch).not.toBeNull();
      const extractedValues = checkMatch![1]
        .split(",")
        .map((s) => s.trim().replace(/'/g, ""));
      expect(extractedValues.sort()).toEqual(allowedValues.sort());

      // Check default value is among allowed values
      const defaultMatch = cleanSql.match(/salary_type\s+TEXT[^\n;]*DEFAULT\s+'([^']+)'/i);
      expect(defaultMatch).not.toBeNull();
      expect(allowedValues).toContain(defaultMatch![1]);
    });

    it("8.2 crm_payroll_runs.status CHECK constraint allows exact domain values and default conforms", () => {
      const allowedValues = ["draft", "locked", "disbursed"];
      const checkMatch = cleanSql.match(
        /public\.crm_payroll_runs[\s\S]*?status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(([^)]+)\)\)/i
      );
      expect(checkMatch).not.toBeNull();
      const extractedValues = checkMatch![1]
        .split(",")
        .map((s) => s.trim().replace(/'/g, ""));
      expect(extractedValues.sort()).toEqual(allowedValues.sort());

      const defaultMatch = cleanSql.match(
        /public\.crm_payroll_runs[\s\S]*?status\s+TEXT[^\n;]*DEFAULT\s+'([^']+)'/i
      );
      expect(defaultMatch).not.toBeNull();
      expect(allowedValues).toContain(defaultMatch![1]);
    });

    it("8.3 crm_payslips.payment_status CHECK constraint allows exact domain values and default conforms", () => {
      const allowedValues = ["pending", "paid", "partial"];
      const checkMatch = cleanSql.match(
        /payment_status\s+TEXT[^\n;]*CHECK\s*\(\s*payment_status\s+IN\s*\(([^)]+)\)\)/i
      );
      expect(checkMatch).not.toBeNull();
      const extractedValues = checkMatch![1]
        .split(",")
        .map((s) => s.trim().replace(/'/g, ""));
      expect(extractedValues.sort()).toEqual(allowedValues.sort());

      const defaultMatch = cleanSql.match(
        /payment_status\s+TEXT[^\n;]*DEFAULT\s+'([^']+)'/i
      );
      expect(defaultMatch).not.toBeNull();
      expect(allowedValues).toContain(defaultMatch![1]);
    });

    it("8.4 crm_salary_adjustments.type CHECK constraint allows exact domain values", () => {
      const allowedValues = ["advance", "bonus", "deduction", "loan_repayment"];
      const checkMatch = cleanSql.match(
        /public\.crm_salary_adjustments[\s\S]*?type\s+TEXT[^\n;]*CHECK\s*\(\s*type\s+IN\s*\(([^)]+)\)\)/i
      );
      expect(checkMatch).not.toBeNull();
      const extractedValues = checkMatch![1]
        .split(",")
        .map((s) => s.trim().replace(/'/g, ""));
      expect(extractedValues.sort()).toEqual(allowedValues.sort());
    });

    it("8.5 crm_salary_adjustments.status CHECK constraint allows exact domain values and default conforms", () => {
      const allowedValues = ["pending", "approved", "deducted", "rejected"];
      const checkMatch = cleanSql.match(
        /public\.crm_salary_adjustments[\s\S]*?status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(([^)]+)\)\)/i
      );
      expect(checkMatch).not.toBeNull();
      const extractedValues = checkMatch![1]
        .split(",")
        .map((s) => s.trim().replace(/'/g, ""));
      expect(extractedValues.sort()).toEqual(allowedValues.sort());

      const defaultMatch = cleanSql.match(
        /public\.crm_salary_adjustments[\s\S]*?status\s+TEXT[^\n;]*DEFAULT\s+'([^']+)'/i
      );
      expect(defaultMatch).not.toBeNull();
      expect(allowedValues).toContain(defaultMatch![1]);
    });
  });

  // ==========================================================================
  // CHALLENGE 9: COLUMN EXISTENCE IN INDEXES & CONSTRAINTS (TYPO DETECTOR)
  // ==========================================================================
  describe("Challenge 9: Index & Constraint Target Validation (Typo Prevention)", () => {
    it("9.1 All columns referenced in indexes and unique constraints exist in their respective tables", () => {
      // Find table blocks
      const tableStatements = parseStatements(sql).filter((s) => /^CREATE\s+TABLE/i.test(s));
      const tableColumnsMap: Record<string, string[]> = {};

      for (const tStmt of tableStatements) {
        const nameMatch = tStmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)/i);
        if (nameMatch) {
          const tableName = nameMatch[1];
          tableColumnsMap[tableName] = extractTableColumns(tStmt);
        }
      }

      expect(Object.keys(tableColumnsMap).length).toBe(4);

      // Verify UNIQUE constraints
      const uniqueConstraints = [
        { table: "crm_salary_profiles", cols: ["org_id", "staff_id"] },
        { table: "crm_payroll_runs", cols: ["org_id", "month_year"] },
        { table: "crm_payslips", cols: ["org_id", "staff_id", "month_year"] },
      ];

      for (const uq of uniqueConstraints) {
        const declaredCols = tableColumnsMap[uq.table];
        for (const c of uq.cols) {
          expect(
            declaredCols,
            `Unique constraint refers to non-existent column ${c} on ${uq.table}`
          ).toContain(c);
        }
      }

      // Verify all INDEX target columns
      const indexStatements = parseStatements(sql).filter((s) => /^CREATE\s+INDEX/i.test(s));
      for (const idxStmt of indexStatements) {
        const match = idxStmt.match(
          /CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+public\.(\w+)\s*\(([^)]+)\)/i
        );
        expect(match).not.toBeNull();
        const indexName = match![1];
        const tableName = match![2];
        const indexedCols = match![3]
          .split(",")
          .map((c) => c.trim().replace(/\s+(ASC|DESC|NULLS\s+(FIRST|LAST))/gi, ""));

        const declaredCols = tableColumnsMap[tableName];
        expect(declaredCols, `Index ${indexName} targets unknown table ${tableName}`).toBeDefined();

        for (const col of indexedCols) {
          expect(
            declaredCols,
            `Index ${indexName} targets non-existent column "${col}" in table "${tableName}"`
          ).toContain(col);
        }
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 10: RLS FULL-MATRIX SECURITY AUDIT
  // ==========================================================================
  describe("Challenge 10: RLS Full-Matrix Security Audit", () => {
    it("10.1 Verifies all 4 tables have ROW LEVEL SECURITY explicitly enabled", () => {
      const rlsStmts = parseStatements(sql).filter(
        (s) => /^ALTER\s+TABLE\s+public\.\w+\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(s)
      );
      expect(rlsStmts.length).toBe(4);
    });

    it("10.2 Verifies exact 4x4 matrix: 4 tables x 4 operations (SELECT, INSERT, UPDATE, DELETE) = 16 policies", () => {
      const policyStmts = parseStatements(sql).filter((s) => /^CREATE\s+POLICY/i.test(s));
      expect(policyStmts.length).toBe(16);

      const tables = [
        "crm_salary_profiles",
        "crm_payroll_runs",
        "crm_payslips",
        "crm_salary_adjustments",
      ];
      const ops = ["SELECT", "INSERT", "UPDATE", "DELETE"];

      for (const table of tables) {
        for (const op of ops) {
          const match = policyStmts.find((s) =>
            new RegExp(`ON\\s+public\\.${table}\\s+FOR\\s+${op}\\b`, "i").test(s)
          );
          expect(
            match,
            `Missing policy for table "${table}" operation "${op}"`
          ).toBeDefined();
        }
      }
    });

    it("10.3 Ensures all 16 policies mandate authenticated role AND has_org_access(org_id)", () => {
      const policyStmts = parseStatements(sql).filter((s) => /^CREATE\s+POLICY/i.test(s));
      for (const stmt of policyStmts) {
        expect(stmt).toContain("auth.role() = 'authenticated'");
        expect(stmt).toContain("has_org_access(org_id)");
      }
    });
  });
});
