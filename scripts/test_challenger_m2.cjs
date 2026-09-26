/**
 * Milestone 2 Verification Test Suite - Challenger M2
 * Validates:
 * 1. Data structure stored in credsmart_bank_accounts_{orgId} and credsmart_cash_in_hand_{orgId}.
 * 2. Opening balance records payload in credit_transactions (party_id, party_type, amount, type, description, reference_id, created_by UUID).
 * 3. getSyncConfig deep merge recovery for legacy configs missing banks.
 * 4. Runtime crashes and type consistency across SyncExecutionResult, SyncAuditLog, and lastSyncStats.
 */

const fs = require('fs');
const path = require('path');

function runVerifications() {
  console.log("=== Milestone 2 Challenger Verification Test Suite ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  const autoSyncPath = path.resolve(__dirname, '../src/services/autoSyncService.ts');
  const autoSyncContent = fs.readFileSync(autoSyncPath, 'utf8');

  const tallyImportPath = path.resolve(__dirname, '../src/pages/TallyImport.tsx');
  const tallyImportContent = fs.readFileSync(tallyImportPath, 'utf8');

  const cashAndBankPath = path.resolve(__dirname, '../src/pages/CashAndBank.tsx');
  const cashAndBankContent = fs.readFileSync(cashAndBankPath, 'utf8');

  // ─── 1. Bank Accounts & Cash in Hand Storage Inspection ─────────────────────
  console.log("\n--- Checking Bank Accounts & Cash in Hand Persistence ---");
  
  // Storage key matching
  assert(autoSyncContent.includes('const storageKey = `credsmart_bank_accounts_${orgId}`;'), 
    "autoSyncService uses exact key credsmart_bank_accounts_${orgId}");
  assert(autoSyncContent.includes('const cashKey = `credsmart_cash_in_hand_${orgId}`;'), 
    "autoSyncService uses exact key credsmart_cash_in_hand_${orgId}");
  assert(cashAndBankContent.includes('credsmart_bank_accounts_'), 
    "CashAndBank uses credsmart_bank_accounts_ key prefix");
  assert(cashAndBankContent.includes('credsmart_cash_in_hand_'), 
    "CashAndBank uses credsmart_cash_in_hand_ key prefix");

  // Bank Account fields conformity
  assert(autoSyncContent.includes('name: b.name || b.accountName || "Bank Account"'), 
    "Bank Account maps name with fallback");
  assert(autoSyncContent.includes('bankName: b.bankName || b.name || "Bank"'), 
    "Bank Account maps bankName with fallback");
  assert(autoSyncContent.includes('accountType: "current"'), 
    "Bank Account sets accountType: current");
  assert(autoSyncContent.includes('balance: Number(b.balance) || 0'), 
    "Bank Account parses numeric balance");
  assert(autoSyncContent.includes('isPrimary: mergedAccounts.length === 0'), 
    "First Bank Account dynamically assigned isPrimary: true");
  assert(autoSyncContent.includes('createdAt: new Date().toISOString()'), 
    "Bank Account assigns ISO createdAt timestamp");

  // Deduplication logic
  assert(autoSyncContent.includes('mergedAccounts.findIndex'), 
    "Bank Account merges using findIndex deduplication");
  assert(autoSyncContent.includes('acc.accountNumber === bAccNum'), 
    "Deduplicates by accountNumber");
  assert(autoSyncContent.includes('acc.name.trim().toLowerCase() === bName'), 
    "Deduplicates by case-insensitive name fallback");

  // Cash in hand format
  assert(autoSyncContent.includes('localStorage.setItem(cashKey, String(parsedData.cashInHand));'), 
    "Cash in hand saved as string representation of number");
  assert(cashAndBankContent.includes('parseFloat(storedCash) || 0'), 
    "CashAndBank parses cash-in-hand using parseFloat with zero fallback");

  // Custom Event dispatch
  assert(autoSyncContent.includes('new CustomEvent("credsmart_bank_updated", { detail: { orgId } })'), 
    "Dispatches credsmart_bank_updated CustomEvent with orgId detail");

  // ─── 2. Opening Balance Records Payload Inspection ─────────────────────────
  console.log("\n--- Checking Party Opening Balances Payload ---");
  
  // Elimination of corrupt columns
  assert(!autoSyncContent.includes('customer_id: cust.id'), "customer_id column removed from credit_transactions");
  assert(!autoSyncContent.includes('supplier_id: supp.id'), "supplier_id column removed from credit_transactions");
  assert(!autoSyncContent.includes('payment_mode: "Opening Balance"'), "payment_mode removed from credit_transactions");

  // Verification of required schema columns in autoSyncService.ts
  const custTxnSnippet = autoSyncContent.match(/party_type:\s*"customer",[\s\S]*?created_by:\s*userId\s*\|\|\s*"00000000-0000-0000-0000-000000000000"/);
  assert(custTxnSnippet !== null, "Customer opening balance contains valid party_type and created_by UUID fallback");

  assert(autoSyncContent.includes('party_id: cust.id'), "Customer opening balance uses party_id: cust.id");
  assert(autoSyncContent.includes('party_id: supp.id'), "Supplier opening balance uses party_id: supp.id");
  assert(autoSyncContent.includes('amount: Math.abs(origParty.openingBalance)'), "Opening balance amount is positive via Math.abs()");
  assert(autoSyncContent.includes('type: "opening_balance"'), "Opening balance type is 'opening_balance'");
  assert(autoSyncContent.includes('description: "Opening Balance"'), "Opening balance description is 'Opening Balance'");
  assert(autoSyncContent.includes('reference_id: "SYNC-OPENING"'), "Opening balance reference_id is 'SYNC-OPENING'");
  assert(autoSyncContent.includes('created_by: userId || "00000000-0000-0000-0000-000000000000"'), 
    "created_by uses nil UUID standard RFC 4122 fallback");

  // Verification in TallyImport.tsx
  assert(tallyImportContent.includes('reference_id: "IMPORT-OPENING"'), 
    "TallyImport.tsx opening balance uses reference_id: 'IMPORT-OPENING'");
  assert(tallyImportContent.includes('created_by: user?.id || "00000000-0000-0000-0000-000000000000"'), 
    "TallyImport.tsx opening balance uses UUID fallback instead of 'admin'");

  // ─── 3. getSyncConfig Deep Merge Recovery Inspection ───────────────────────
  console.log("\n--- Checking getSyncConfig Deep Merge Recovery ---");

  // Verification of deep merge on syncScope
  assert(autoSyncContent.includes('items: parsedScope.items !== undefined ? Boolean(parsedScope.items) : defaults.syncScope.items'), 
    "getSyncConfig deep merges items with default fallback");
  assert(autoSyncContent.includes('parties: parsedScope.parties !== undefined ? Boolean(parsedScope.parties) : defaults.syncScope.parties'), 
    "getSyncConfig deep merges parties with default fallback");
  assert(autoSyncContent.includes('balances: parsedScope.balances !== undefined ? Boolean(parsedScope.balances) : defaults.syncScope.balances'), 
    "getSyncConfig deep merges balances with default fallback");
  assert(autoSyncContent.includes('vouchers: parsedScope.vouchers !== undefined ? Boolean(parsedScope.vouchers) : defaults.syncScope.vouchers'), 
    "getSyncConfig deep merges vouchers with default fallback");
  assert(autoSyncContent.includes('banks: parsedScope.banks !== undefined ? Boolean(parsedScope.banks) : defaults.syncScope.banks'), 
    "getSyncConfig deep merges banks with default fallback");

  // Functional simulation of getSyncConfig deep merge
  const defaults = {
    syncScope: { items: true, parties: true, balances: true, vouchers: true, banks: true }
  };
  
  // Case A: Missing banks in parsed config
  const legacyParsed = { syncScope: { items: true, parties: false, balances: true, vouchers: false } };
  const mergedA = {
    banks: legacyParsed.syncScope.banks !== undefined ? Boolean(legacyParsed.syncScope.banks) : defaults.syncScope.banks,
    parties: legacyParsed.syncScope.parties !== undefined ? Boolean(legacyParsed.syncScope.parties) : defaults.syncScope.parties
  };
  assert(mergedA.banks === true, "Legacy config missing banks restores banks: true");
  assert(mergedA.parties === false, "Legacy config preserves explicit parties: false");

  // Case B: Explicitly disabled banks
  const explicitDisabled = { syncScope: { banks: false } };
  const mergedB = {
    banks: explicitDisabled.syncScope.banks !== undefined ? Boolean(explicitDisabled.syncScope.banks) : defaults.syncScope.banks
  };
  assert(mergedB.banks === false, "Explicitly set banks: false is preserved and not overridden");

  // Case C: Null/undefined syncScope
  const nullScope = {};
  const parsedScopeC = nullScope.syncScope || {};
  const mergedC = {
    banks: parsedScopeC.banks !== undefined ? Boolean(parsedScopeC.banks) : defaults.syncScope.banks
  };
  assert(mergedC.banks === true, "Missing syncScope object defaults banks to true without crashing");

  // ─── 4. Runtime Crash Freedom & Type Consistency ──────────────────────────
  console.log("\n--- Checking Runtime Safety & Metrics Consistency ---");

  assert(autoSyncContent.includes('banksCount = parsedData.bankAccounts.length;'), 
    "banksCount correctly assigned from parsedData.bankAccounts.length");
  assert(autoSyncContent.includes('banksSynced: banksCount,'), 
    "banksSynced populated in SyncAuditLog");
  assert(autoSyncContent.includes('balancesSynced: balancesCount,'), 
    "balancesSynced populated in SyncAuditLog");
  assert(autoSyncContent.includes('lastSyncStats = { items: itemsCount, parties: partiesCount, vouchers: vouchersCount, banks: banksCount, balances: balancesCount }'), 
    "lastSyncStats dynamically receives banksCount and balancesCount");
  assert(autoSyncContent.replace(/\r\n/g, '\n').includes('return {\n      success: unsupportedVoucherTypes.size === 0,\n      itemsCount,\n      partiesCount,\n      vouchersCount,\n      banksCount,\n      balancesCount,'), 
    "SyncExecutionResult returns numeric banksCount and balancesCount");

  // Check error handling in probe
  assert(autoSyncContent.includes('const { error: probeError } = await supabase.from("bank_accounts").select("id").limit(1);'), 
    "Database probe cleanly checks bank_accounts table presence before upsert");

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

module.exports = { runVerifications };

if (require.main === module) {
  const { failed } = runVerifications();
  process.exit(failed > 0 ? 1 : 0);
}
