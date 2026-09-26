const fs = require("fs");
const path = require("path");

function runVerifications() {
  console.log("=== Milestone 3 & 4 Challenger Verification Suite ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const root = path.resolve(__dirname, "..");
  const autoSyncPath = path.join(root, "src/services/autoSyncService.ts");
  const tallyImportPath = path.join(root, "src/pages/TallyImport.tsx");
  const syncAgentPath = path.join(root, "scripts/credsmart-sync-agent/index.cjs");

  const autoSync = fs.readFileSync(autoSyncPath, "utf8").replace(/\r\n/g, "\n");
  const tallyImport = fs.readFileSync(tallyImportPath, "utf8").replace(/\r\n/g, "\n");
  const syncAgent = fs.readFileSync(syncAgentPath, "utf8").replace(/\r\n/g, "\n");

  // 1. Day Book Query Verification
  console.log("--- 1. Day Book & Sync Scope Protocols ---");
  assert(autoSync.includes("<SVFROMDATE>20200401</SVFROMDATE>"), "autoSyncService includes SVFROMDATE");
  assert(autoSync.includes("<SVTODATE>20291231</SVTODATE>"), "autoSyncService includes SVTODATE");
  assert(syncAgent.includes("<SVFROMDATE>20200401</SVFROMDATE>"), "syncAgent includes SVFROMDATE");
  assert(syncAgent.includes("<SVTODATE>20291231</SVTODATE>"), "syncAgent includes SVTODATE");
  assert(autoSync.includes("banks: true") && autoSync.includes("vouchers: true"), "getDefaultSyncConfig enables banks and vouchers by default");

  // 2. Vouchers Ingestion Verification
  console.log("\n--- 2. Transactional Ingestion in autoSyncService ---");
  assert(autoSync.includes('supabase.from("sale_items").insert'), "autoSyncService inserts sale_items");
  assert(autoSync.includes('supabase.from("purchase_invoice_items").insert'), "autoSyncService inserts purchase_invoice_items");
  assert(autoSync.includes('supabase.from("expenses").insert'), "autoSyncService inserts expenses");
  assert(autoSync.includes('party_type: "customer"') && autoSync.includes('type: "payment"'), "autoSyncService records customer receipts as payments");
  assert(autoSync.includes('party_type: "supplier"') && autoSync.includes('type: "payment"'), "autoSyncService records vendor payments as payments");
  assert(autoSync.includes("isExpenseVoucher"), "autoSyncService identifies expense vouchers");

  // 3. Bank & Cash Persistence
  console.log("\n--- 3. Bank Accounts & Cash in Hand Persistence ---");
  assert(autoSync.includes("credsmart_bank_accounts_"), "autoSyncService uses credsmart_bank_accounts_ key");
  assert(autoSync.includes("credsmart_cash_in_hand_"), "autoSyncService uses credsmart_cash_in_hand_ key");
  assert(autoSync.includes("credsmart_bank_updated"), "autoSyncService dispatches credsmart_bank_updated event");

  // 4. Party Opening Balances Schema Alignment
  console.log("\n--- 4. Party Opening Balances Schema ---");
  assert(!autoSync.includes("customer_id: cust.id"), "customer_id column removed from credit_transactions");
  assert(!autoSync.includes("supplier_id: supp.id"), "supplier_id column removed from credit_transactions");
  assert(autoSync.includes('type: "opening_balance"') && autoSync.includes("reference_id: \"SYNC-OPENING\""), "credit_transactions uses correct opening balance schema");

  // 5. TallyImport.tsx Verification
  console.log("\n--- 5. TallyImport UI Controls & Modal Integration ---");
  assert(tallyImport.includes("handleDirectSaveBankAccounts = async"), "handleDirectSaveBankAccounts is defined");
  assert(tallyImport.includes("onImportBankAccounts={async (banks, cashInHand) =>"), "TallyImportModal receives onImportBankAccounts");
  assert(tallyImport.includes('{ key: "vouchers" as const, label: "Invoices & Vouchers" }'), "Auto-Sync UI includes vouchers scope toggle");
  assert(tallyImport.includes('{ key: "banks" as const, label: "Bank & Cash Accounts" }'), "Auto-Sync UI includes banks scope toggle");
  assert(tallyImport.includes("Vouchers Synced") && (tallyImport.includes("Banks & Cash") || tallyImport.includes("Banks &amp; Cash")), "Auto-Sync UI stat grid displays Vouchers and Banks");
  assert(tallyImport.includes("SAMPLE_TALLY_LIVE_BANKS") && tallyImport.includes("SAMPLE_TALLY_LIVE_VOUCHERS"), "Simulated sync includes sample banks and vouchers");
  assert(autoSync.includes("CredSmart_Tally_Daybook.xml"), "Windows sync batch script exports Daybook XML");

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

if (require.main === module) {
  const { failed } = runVerifications();
  process.exit(failed > 0 ? 1 : 0);
}
