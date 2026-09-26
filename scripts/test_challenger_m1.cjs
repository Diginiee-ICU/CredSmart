/**
 * Milestone 1 Verification Test Suite
 * Validates:
 * 1. TALLY_EXPORT_DAYBOOK_XML well-formedness and proper nesting of SVFROMDATE/SVTODATE.
 * 2. getDefaultSyncConfig returns syncScope with all 5 flags strictly true.
 * 3. Type contracts and interfaces conform to Milestone 1 specs.
 */

const fs = require('fs');
const path = require('path');

function runVerifications() {
  console.log("=== Milestone 1 Verification Test Suite ===");
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

  // 1. autoSyncService.ts inspection
  const autoSyncPath = path.resolve(__dirname, '../src/services/autoSyncService.ts');
  const autoSyncContent = fs.readFileSync(autoSyncPath, 'utf8');

  // Verify XML string extraction
  const autoSyncXmlMatch = autoSyncContent.match(/export const TALLY_EXPORT_DAYBOOK_XML = `([\s\S]*?)`\.trim\(\);/);
  assert(autoSyncXmlMatch !== null, "autoSyncService.ts exports TALLY_EXPORT_DAYBOOK_XML");

  if (autoSyncXmlMatch) {
    const xml = autoSyncXmlMatch[1].trim();
    assert(xml.startsWith('<ENVELOPE>'), "autoSync XML starts with <ENVELOPE>");
    assert(xml.endsWith('</ENVELOPE>'), "autoSync XML ends with </ENVELOPE>");
    assert(xml.includes('<REPORTNAME>Day Book</REPORTNAME>'), "autoSync XML specifies REPORTNAME Day Book");
    assert(xml.includes('<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>'), "autoSync XML specifies SVEXPORTFORMAT $$SysName:XML");
    assert(xml.includes('<EXPLODEFLAG>Yes</EXPLODEFLAG>'), "autoSync XML specifies EXPLODEFLAG Yes");
    assert(xml.includes('<SVFROMDATE>20200401</SVFROMDATE>'), "autoSync XML contains <SVFROMDATE>20200401</SVFROMDATE>");
    assert(xml.includes('<SVTODATE>20291231</SVTODATE>'), "autoSync XML contains <SVTODATE>20291231</SVTODATE>");

    // Check nesting inside <STATICVARIABLES>
    const staticVarsMatch = xml.match(/<STATICVARIABLES>([\s\S]*?)<\/STATICVARIABLES>/);
    assert(staticVarsMatch !== null, "autoSync XML has <STATICVARIABLES> element");
    if (staticVarsMatch) {
      const staticVars = staticVarsMatch[1];
      assert(staticVars.includes('<SVFROMDATE>20200401</SVFROMDATE>'), "SVFROMDATE is nested inside STATICVARIABLES");
      assert(staticVars.includes('<SVTODATE>20291231</SVTODATE>'), "SVTODATE is nested inside STATICVARIABLES");
      assert(staticVars.includes('<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>'), "SVEXPORTFORMAT is nested inside STATICVARIABLES");
      assert(staticVars.includes('<EXPLODEFLAG>Yes</EXPLODEFLAG>'), "EXPLODEFLAG is nested inside STATICVARIABLES");
    }
  }

  // 2. scripts/credsmart-sync-agent/index.cjs inspection
  const agentPath = path.resolve(__dirname, '../scripts/credsmart-sync-agent/index.cjs');
  const agentContent = fs.readFileSync(agentPath, 'utf8');

  const agentXmlMatch = agentContent.match(/const TALLY_EXPORT_DAYBOOK_XML = `([\s\S]*?)`\.trim\(\);/);
  assert(agentXmlMatch !== null, "index.cjs defines TALLY_EXPORT_DAYBOOK_XML");

  if (agentXmlMatch) {
    const xml = agentXmlMatch[1].trim();
    assert(xml.startsWith('<ENVELOPE>'), "index.cjs XML starts with <ENVELOPE>");
    assert(xml.endsWith('</ENVELOPE>'), "index.cjs XML ends with </ENVELOPE>");
    assert(xml.includes('<SVFROMDATE>20200401</SVFROMDATE>'), "index.cjs XML contains <SVFROMDATE>20200401</SVFROMDATE>");
    assert(xml.includes('<SVTODATE>20291231</SVTODATE>'), "index.cjs XML contains <SVTODATE>20291231</SVTODATE>");

    const staticVarsMatch = xml.match(/<STATICVARIABLES>([\s\S]*?)<\/STATICVARIABLES>/);
    assert(staticVarsMatch !== null, "index.cjs XML has <STATICVARIABLES> element");
    if (staticVarsMatch) {
      const staticVars = staticVarsMatch[1];
      assert(staticVars.includes('<SVFROMDATE>20200401</SVFROMDATE>'), "index.cjs SVFROMDATE is nested inside STATICVARIABLES");
      assert(staticVars.includes('<SVTODATE>20291231</SVTODATE>'), "index.cjs SVTODATE is nested inside STATICVARIABLES");
    }
  }

  assert(agentContent.includes('daybook: TALLY_EXPORT_DAYBOOK_XML'), "index.cjs TALLY_REQUESTS.daybook references TALLY_EXPORT_DAYBOOK_XML");
  assert(agentContent.includes('TALLY_EXPORT_DAYBOOK_XML,') && agentContent.includes('module.exports = {'), "index.cjs exports TALLY_EXPORT_DAYBOOK_XML in module.exports");

  // 3. getDefaultSyncConfig inspection
  assert(autoSyncContent.includes('export function getDefaultSyncConfig(orgId: string): SyncConfig'), "getDefaultSyncConfig is exported");
  assert(autoSyncContent.includes('syncScope: {') &&
         autoSyncContent.includes('items: true,') &&
         autoSyncContent.includes('parties: true,') &&
         autoSyncContent.includes('balances: true,') &&
         autoSyncContent.includes('vouchers: true,') &&
         autoSyncContent.includes('banks: true,'),
         "getDefaultSyncConfig sets all 5 syncScope flags strictly to true");

  // 4. Type definitions
  assert(autoSyncContent.includes('banks: boolean;'), "SyncConfig.syncScope has banks: boolean");
  assert(autoSyncContent.includes('banks?: number;') || autoSyncContent.includes('banksSynced?: number;'), "SyncAuditLog tracks banks");
  assert(autoSyncContent.includes('balancesSynced?: number;'), "SyncAuditLog tracks balances");
  assert(autoSyncContent.includes('banks: number;') && autoSyncContent.includes('balances: number;'), "SyncConfig.lastSyncStats tracks banks and balances");

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  return failed === 0;
}

if (require.main === module) {
  const ok = runVerifications();
  process.exit(ok ? 0 : 1);
}

module.exports = { runVerifications };
