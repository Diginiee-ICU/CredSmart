const fs = require('fs');
const content = fs.readFileSync('C:/Users/Rudra/.gemini/antigravity/brain/9d8d559e-16e9-442c-9c01-70f29e980d42/.system_generated/steps/675/content.md', 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('iframe') || line.includes('gstin-search.js') || line.includes('gstin-input') || line.includes('search-gstin') || line.includes('api.tallysolutions') || line.includes('taxpayer')) {
    console.log(`Line ${i}:`, line.slice(0, 200));
  }
}
