const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'proposed_20261017020000_create_crm_salary_tables.sql');
const migrationSql = fs.readFileSync(file, 'utf-8');

console.log('File size:', migrationSql.length);
console.log('Starts with BEGIN;', migrationSql.trim().startsWith('BEGIN;'));
console.log('Ends with COMMIT;', migrationSql.trim().endsWith('COMMIT;'));

const unescaped = migrationSql.replace(/''/g, '');
const singleQuotes = (unescaped.match(/'/g) || []).length;
console.log('Single quotes even?', singleQuotes % 2 === 0, singleQuotes);

const doubleQuotes = (migrationSql.match(/"/g) || []).length;
console.log('Double quotes even?', doubleQuotes % 2 === 0, doubleQuotes);

let openP = 0, closeP = 0, inQuote = false;
for (let i = 0; i < migrationSql.length; i++) {
  const c = migrationSql[i];
  if (c === "'" && migrationSql[i - 1] !== "\\") inQuote = !inQuote;
  if (!inQuote) {
    if (c === '(') openP++;
    if (c === ')') closeP++;
  }
}
console.log('Parens balanced?', openP === closeP, openP, closeP);

const tables = (migrationSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.\w+/gi) || []);
console.log('Tables count:', tables.length, tables.every(t => t.toUpperCase().includes('IF NOT EXISTS')));

const indexes = (migrationSql.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+/gi) || []);
console.log('Indexes count:', indexes.length, indexes.every(i => i.toUpperCase().includes('IF NOT EXISTS')));

const triggers = Array.from(migrationSql.matchAll(/CREATE\s+TRIGGER\s+(\w+)\s+BEFORE\s+UPDATE\s+ON\s+public\.(\w+)/gi));
console.log('Triggers count:', triggers.length);
for (const match of triggers) {
  const triggerName = match[1];
  const tableName = match[2];
  const dropPattern = new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${triggerName}\\s+ON\\s+public\\.${tableName};`, 'i');
  console.log(`Trigger drop for ${triggerName}:`, dropPattern.test(migrationSql));
}

const policies = Array.from(migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.(\w+)/gi));
console.log('Policies count:', policies.length);
let allPoliciesHaveDrop = true;
for (const match of policies) {
  const policyName = match[1];
  const tableName = match[2];
  const dropPattern = new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policyName}"\\s+ON\\s+public\\.${tableName};`, 'i');
  if (!dropPattern.test(migrationSql)) {
    console.error(`Missing drop policy for "${policyName}" on ${tableName}`);
    allPoliciesHaveDrop = false;
  }
}
console.log('All policies have preceding DROP POLICY IF EXISTS:', allPoliciesHaveDrop);

// Check Suite 3 regexes
const test7Regexes = [
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_salary_profiles\s*\(/i,
  /id\s+UUID\s+(NOT\s+NULL\s+)?(DEFAULT\s+gen_random_uuid\(\)\s+)?PRIMARY\s+KEY/i,
  /org_id\s+UUID\s+NOT\s+NULL/i,
  /staff_id\s+UUID\s+NOT\s+NULL/i,
  /salary_type\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'monthly'/i,
  /base_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /currency\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'INR'/i,
  /allowed_leaves_per_month\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+2/i,
  /hourly_overtime_rate\s+NUMERIC\(10,\s*2\)\s+DEFAULT\s+0(\.00)?/i,
  /pf_deduction_percent\s+NUMERIC\(5,\s*2\)\s+DEFAULT\s+0(\.00)?/i,
  /esi_deduction_percent\s+NUMERIC\(5,\s*2\)\s+DEFAULT\s+0(\.00)?/i,
  /is_active\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+true/i,
  /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+now\(\)/i,
  /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+now\(\)/i
];
console.log('Test 7 all pass:', test7Regexes.every(r => r.test(migrationSql)));

const test8Regexes = [
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_payroll_runs\s*\(/i,
  /month_year\s+TEXT\s+NOT\s+NULL/i,
  /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'draft'/i,
  /total_payout\s+NUMERIC\(14,\s*2\)\s+DEFAULT\s+0(\.00)?/i,
  /staff_count\s+INTEGER\s+DEFAULT\s+0/i,
  /locked_by\s+UUID/i,
  /locked_at\s+TIMESTAMPTZ/i,
  /notes\s+TEXT/i
];
console.log('Test 8 all pass:', test8Regexes.every(r => r.test(migrationSql)));

const test9Regexes = [
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_payslips\s*\(/i,
  /payroll_run_id\s+UUID\s+NOT\s+NULL/i,
  /salary_profile_snapshot\s+JSONB\s+NOT\s+NULL/i,
  /working_days_in_month\s+INTEGER\s+NOT\s+NULL/i,
  /present_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i,
  /absent_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i,
  /half_days\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i,
  /lop_days\s+NUMERIC\(5,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0/i,
  /overtime_minutes\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i,
  /gross_salary\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /lop_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /overtime_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /pf_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /esi_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /advance_deduction\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /bonus_amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /net_salary\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.00)?/i,
  /payment_status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i,
  /paid_at\s+TIMESTAMPTZ/i
];
console.log('Test 9 all pass:', test9Regexes.every(r => r.test(migrationSql)));

const test10Regexes = [
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.crm_salary_adjustments\s*\(/i,
  /type\s+TEXT\s+NOT\s+NULL/i,
  /amount\s+NUMERIC\(12,\s*2\)\s+NOT\s+NULL/i,
  /description\s+TEXT/i,
  /month_year\s+TEXT/i,
  /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i,
  /requested_by\s+UUID/i,
  /approved_by\s+UUID/i,
  /approved_at\s+TIMESTAMPTZ/i
];
console.log('Test 10 all pass:', test10Regexes.every(r => r.test(migrationSql)));

const test11Regexes = [
  /org_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.organizations\(id\)\s+ON\s+DELETE\s+CASCADE/i,
  /staff_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+CASCADE/i,
  /payroll_run_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.crm_payroll_runs\(id\)\s+ON\s+DELETE\s+CASCADE/i,
  /locked_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i,
  /requested_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i,
  /approved_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i
];
console.log('Test 11 all pass:', test11Regexes.every(r => r.test(migrationSql)));

const test12Regexes = [
  /CONSTRAINT\s+uq_crm_salary_profiles_staff\s+UNIQUE\s*\(\s*org_id\s*,\s*staff_id\s*\)/i,
  /CONSTRAINT\s+uq_crm_payroll_runs_month\s+UNIQUE\s*\(\s*org_id\s*,\s*month_year\s*\)/i,
  /CONSTRAINT\s+uq_crm_payslips_staff_month\s+UNIQUE\s*\(\s*org_id\s*,\s*staff_id\s*,\s*month_year\s*\)/i
];
console.log('Test 12 all pass:', test12Regexes.every(r => r.test(migrationSql)));

const test13Regexes = [
  /salary_type\s+TEXT[^\n;]*CHECK\s*\(\s*salary_type\s+IN\s*\(\s*'monthly'\s*,\s*'daily'\s*,\s*'hourly'\s*\)\s*\)/i,
  /status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(\s*'draft'\s*,\s*'locked'\s*,\s*'disbursed'\s*\)\s*\)/i,
  /payment_status\s+TEXT[^\n;]*CHECK\s*\(\s*payment_status\s+IN\s*\(\s*'pending'\s*,\s*'paid'\s*,\s*'partial'\s*\)\s*\)/i,
  /type\s+TEXT[^\n;]*CHECK\s*\(\s*type\s+IN\s*\(\s*'advance'\s*,\s*'bonus'\s*,\s*'deduction'\s*,\s*'loan_repayment'\s*\)\s*\)/i,
  /status\s+TEXT[^\n;]*CHECK\s*\(\s*status\s+IN\s*\(\s*'pending'\s*,\s*'approved'\s*,\s*'deducted'\s*,\s*'rejected'\s*\)\s*\)/i
];
console.log('Test 13 all pass:', test13Regexes.every(r => r.test(migrationSql)));

const policyDefs = Array.from(migrationSql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"[\s\S]*?;/gi));
console.log('Test 21 all policies have auth.role and has_org_access:', policyDefs.every(p => p[0].includes("auth.role() = 'authenticated'") && p[0].includes("has_org_access(org_id)")));

const tablesWithUpdatedAt = ['crm_salary_profiles', 'crm_payroll_runs', 'crm_payslips'];
console.log('Test 22 triggers pass:', tablesWithUpdatedAt.every(table => {
  const p = new RegExp(`CREATE\\s+TRIGGER\\s+update_${table}_updated_at\\s+BEFORE\\s+UPDATE\\s+ON\\s+public\\.${table}\\s+FOR\\s+EACH\\s+ROW\\s+EXECUTE\\s+FUNCTION\\s+public\\.update_updated_at\\(\\);`, 'i');
  return p.test(migrationSql);
}));

// Add statement splitter and Suite 2/Suite 6 checks
const splitSqlStatements = (sql) => {
  const cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < cleanSql.length; i++) {
    const char = cleanSql[i];
    const prev = i > 0 ? cleanSql[i - 1] : '';

    if (char === "'" && prev !== "\\") {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && prev !== "\\") {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && parenDepth === 0) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
};

const statements = splitSqlStatements(migrationSql);
console.log('Total statements:', statements.length);
console.log('Test 5: statements >= 25:', statements.length >= 25);

const validKeywords = statements.every(stmt => {
  if (stmt === 'BEGIN' || stmt === 'COMMIT') return true;
  return /^(CREATE|ALTER|DROP|GRANT|REVOKE)\b/i.test(stmt);
});
console.log('Test 5: all statements start with valid keywords:', validKeywords);

const balancedInternalParens = statements.every(stmt => {
  let openP = 0, closeP = 0, inQuote = false;
  for (let i = 0; i < stmt.length; i++) {
    const char = stmt[i];
    if (char === "'" && stmt[i - 1] !== "\\") inQuote = !inQuote;
    if (!inQuote) {
      if (char === '(') openP++;
      if (char === ')') closeP++;
    }
  }
  return openP === closeP;
});
console.log('Test 6: balanced parens in each statement:', balancedInternalParens);

const riskyStatements = statements.filter((s) => {
  if (s === 'BEGIN' || s === 'COMMIT') return false;
  const upper = s.toUpperCase();
  if (upper.startsWith("CREATE TABLE") && !upper.includes("IF NOT EXISTS")) return true;
  if (upper.startsWith("CREATE INDEX") && !upper.includes("IF NOT EXISTS")) return true;
  if (upper.startsWith("CREATE POLICY")) return false; // Handled by preceding DROP
  if (upper.startsWith("CREATE TRIGGER")) return false; // Handled by preceding DROP
  if (upper.startsWith("ALTER TABLE") && upper.includes("ENABLE ROW LEVEL SECURITY")) return false;
  if (upper.startsWith("DROP")) return false;
  return false;
});
console.log('Test 18: Risky statements count (should be 0):', riskyStatements.length);
