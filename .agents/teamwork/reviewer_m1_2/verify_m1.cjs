const fs = require('fs');

const autoSyncContent = fs.readFileSync('src/services/autoSyncService.ts', 'utf8');
const agentContent = fs.readFileSync('scripts/credsmart-sync-agent/index.cjs', 'utf8');

console.log('--- TEST 1: XML Envelope and Date Range ---');
const autoSyncHasFromDate = autoSyncContent.includes('<SVFROMDATE>20200401</SVFROMDATE>');
const autoSyncHasToDate = autoSyncContent.includes('<SVTODATE>20291231</SVTODATE>');
const agentHasFromDate = agentContent.includes('<SVFROMDATE>20200401</SVFROMDATE>');
const agentHasToDate = agentContent.includes('<SVTODATE>20291231</SVTODATE>');

console.log('autoSyncService has SVFROMDATE:', autoSyncHasFromDate);
console.log('autoSyncService has SVTODATE:', autoSyncHasToDate);
console.log('agent index.cjs has SVFROMDATE:', agentHasFromDate);
console.log('agent index.cjs has SVTODATE:', agentHasToDate);

function validateXmlTags(xmlString) {
  const stack = [];
  const tagRegex = /<\/?([a-zA-Z0-9_]+)[^>]*>/g;
  let match;
  while ((match = tagRegex.exec(xmlString)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    if (fullTag.endsWith('/>')) continue;
    if (fullTag.startsWith('</')) {
      const popped = stack.pop();
      if (popped !== tagName) {
        return { valid: false, error: `Mismatched tag: expected </${popped}>, got </${tagName}>` };
      }
    } else {
      stack.push(tagName);
    }
  }
  if (stack.length > 0) {
    return { valid: false, error: `Unclosed tags: ${stack.join(', ')}` };
  }
  return { valid: true };
}

const autoSyncXmlMatch = autoSyncContent.match(/export const TALLY_EXPORT_DAYBOOK_XML\s*=\s*`([\s\S]*?)`\.trim\(\);/);
if (!autoSyncXmlMatch) throw new Error('autoSyncService TALLY_EXPORT_DAYBOOK_XML not found');
const autoSyncXml = autoSyncXmlMatch[1];
console.log('autoSyncService XML check:', validateXmlTags(autoSyncXml));

const agentXmlMatch = agentContent.match(/const TALLY_EXPORT_DAYBOOK_XML\s*=\s*`([\s\S]*?)`\.trim\(\);/);
if (!agentXmlMatch) throw new Error('index.cjs TALLY_EXPORT_DAYBOOK_XML not found');
const agentXml = agentXmlMatch[1];
console.log('index.cjs XML check:', validateXmlTags(agentXml));

console.log('\n--- TEST 2: Interfaces ---');
console.log('SyncAuditLog banksSynced?:', /banksSynced\?\s*:\s*number/.test(autoSyncContent));
console.log('SyncAuditLog balancesSynced?:', /balancesSynced\?\s*:\s*number/.test(autoSyncContent));
console.log('SyncConfig syncScope banks:', /banks\s*:\s*boolean/.test(autoSyncContent));
console.log('SyncConfig lastSyncStats banks:', /banks\s*:\s*number/.test(autoSyncContent));
console.log('SyncConfig lastSyncStats balances:', /balances\s*:\s*number/.test(autoSyncContent));
console.log('SyncExecutionResult banksCount?:', /banksCount\?\s*:\s*number/.test(autoSyncContent));
console.log('SyncExecutionResult balancesCount?:', /balancesCount\?\s*:\s*number/.test(autoSyncContent));

console.log('\n--- TEST 3: Default Scope Initialization ---');
const defaultScopeMatch = autoSyncContent.match(/getDefaultSyncConfig[\s\S]*?syncScope:\s*\{([\s\S]*?)\}/);
console.log('default scope block:', defaultScopeMatch ? defaultScopeMatch[1].trim() : 'NOT FOUND');

console.log('\n--- TEST 4: Null / Undefined Edge Cases ---');
// Test merge with legacy config missing banks / balances
const legacyConfig = {
  syncScope: { items: true, parties: true, balances: true, vouchers: true }, // missing banks!
  lastSyncStats: { items: 5, parties: 2, vouchers: 1 }, // missing banks, balances!
};
const defaultScope = { items: true, parties: true, balances: true, vouchers: true, banks: true };
console.log('Legacy config banks in syncScope before deep merge:', legacyConfig.syncScope.banks);
