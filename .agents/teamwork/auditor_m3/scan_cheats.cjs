const fs = require('fs');
const path = require('path');

const files = [
  'src/components/AppSidebar.tsx',
  'src/components/items/CreateItemModal.tsx',
  'src/components/parties/CreatePartyModal.tsx',
  'src/test/mobileErgonomicsChallenger.test.ts'
];

console.log('=== PHASE 2: STATIC CODE & CHEAT ANALYSIS ===');
let foundViolations = false;

for (const file of files) {
  const fullPath = path.join('c:\\Users\\bishn\\OneDrive\\Documents\\GitHub\\CredSmart', file);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Check for test bypasses or disabled tests
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
    const skipped = content.match(/\b(it\.skip|describe\.skip|test\.skip|xit|xtest|xdescribe)\b/g);
    if (skipped) {
      console.log(`[VIOLATION] Found skipped tests in ${file}:`, skipped);
      foundViolations = true;
    }

    const dummyAsserts = content.match(/expect\((true|1|['"]test['"])\)\.to(Be|Equal)\(\1\)/g);
    if (dummyAsserts) {
      console.log(`[VIOLATION] Found dummy assertions in ${file}:`, dummyAsserts);
      foundViolations = true;
    }
  }

  // Check for hardcoded test bypasses / NODE_ENV checks in components
  if (file.endsWith('.tsx')) {
    const nodeEnvBypass = content.match(/process\.env\.NODE_ENV\s*===?\s*['"]test['"]/g);
    if (nodeEnvBypass) {
      console.log(`[VIOLATION] Found NODE_ENV test bypass in ${file}:`, nodeEnvBypass);
      foundViolations = true;
    }

    const dummyReturns = content.match(/\/\/ TODO|\/\/ FIXME|return null; \/\/ dummy/g);
    if (dummyReturns) {
      console.log(`[WARNING/CHECK] Comments in ${file}:`, dummyReturns);
    }
  }
}

if (!foundViolations) {
  console.log('PASS: Zero skipped tests, zero dummy assertions, zero NODE_ENV test bypasses found.');
} else {
  console.log('FAIL: Integrity violation found in static analysis.');
  process.exit(1);
}
