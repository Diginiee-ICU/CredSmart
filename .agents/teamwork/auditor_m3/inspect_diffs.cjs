const { execSync } = require('child_process');
const git = 'C:\\Users\\bishn\\AppData\\Local\\GitHubDesktop\\app-3.6.7\\resources\\app\\git\\cmd\\git.exe';
const files = [
  'src/components/AppSidebar.tsx',
  'src/components/items/CreateItemModal.tsx',
  'src/components/parties/CreatePartyModal.tsx',
  'src/test/mobileErgonomicsChallenger.test.ts'
];

for (const file of files) {
  console.log(`\n=================== DIFF: ${file} ===================`);
  const diff = execSync(`"${git}" diff HEAD -- "${file}"`, { cwd: 'c:\\Users\\bishn\\OneDrive\\Documents\\GitHub\\CredSmart' }).toString();
  console.log(diff || '[NO DIFF]');
}
