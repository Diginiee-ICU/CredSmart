import fs from "fs";
import path from "path";

const srcDir = path.resolve("src");
const counts = {};
const fileDetails = {};

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git") {
        scan(full);
      }
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      if (
        full.includes(".test.") ||
        full.includes("supabase/client.ts") ||
        full.includes("supabase\\client.ts") ||
        full.includes("test/") ||
        full.includes("test\\")
      ) {
        continue;
      }
      const content = fs.readFileSync(full, "utf8");
      // Match any .from("...") or .from('...')
      const regex = /\.from\s*\(\s*["'`](\w+)["'`]\s*\)/g;
      let m;
      while ((m = regex.exec(content)) !== null) {
        const table = m[1];
        counts[table] = (counts[table] || 0) + 1;
        if (!fileDetails[table]) fileDetails[table] = new Set();
        fileDetails[table].add(path.relative(srcDir, full));
      }
    }
  }
}

scan(srcDir);
console.log("Total unique tables matched:", Object.keys(counts).length);
console.log("Counts:", JSON.stringify(counts, null, 2));
const filesByTable = {};
for (const [t, s] of Object.entries(fileDetails)) {
  filesByTable[t] = Array.from(s);
}
console.log("Files by table:", JSON.stringify(filesByTable, null, 2));
