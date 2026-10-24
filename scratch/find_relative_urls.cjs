const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== 'dist' && f !== '.git' && f !== '.gemini') {
        res = res.concat(walk(full));
      }
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.html') || f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('src="./') || content.includes('href="./')) {
        res.push(full);
      }
    }
  }
  return res;
}

console.log(JSON.stringify(walk('.'), null, 2));
